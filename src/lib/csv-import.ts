import { createHash } from "node:crypto";
import iconv from "iconv-lite";
import { categories, type Category, type Specs } from "@/lib/types";
import { parseSpecValue, SPEC_FIELDS, type SpecField } from "@/lib/specs";
import { checkListPrice, parseBadges, splitUsedBadge } from "@/lib/product-status";

// 상품 CSV 일괄등록: 파일 해석 → 열·값 검증 → DB 기존 상품과 비교한 반영 계획. (서버 전용, DB 접근은 import-actions.ts)
export const CSV_MAX_BYTES = 1024 * 1024;
export const CSV_MAX_ROWS = 1000;
export type ImportMode = "insert" | "upsert";

type Kind = "slug" | "name" | "category" | "price" | "listPrice" | "stock" | "description" | "bool" | "badges" | "spec";
type Column = { key: string; label: string; kind: Kind; required?: boolean; aliases?: string[]; field?: SpecField };
// 이전 양식에서 쓰던 규격 열 이름도 계속 인정
const legacySpecAliases: Record<string, string[]> = { power_w: ["전력", "파워용량", "전력/파워용량w"], gpu_length_mm: ["그래픽카드길이"], max_gpu_length_mm: ["케이스gpu허용길이"] };
// label 이 양식(템플릿)의 열 이름. 영문 키와 aliases 도 열 이름으로 인정
export const COLUMNS: Column[] = [
  { key: "slug", label: "상품코드", kind: "slug", required: true, aliases: ["상품URL이름", "코드"] },
  { key: "name", label: "상품명", kind: "name", required: true },
  { key: "category", label: "카테고리", kind: "category", required: true, aliases: ["분류"] },
  { key: "price", label: "판매가", kind: "price", required: true, aliases: ["가격"] },
  { key: "list_price", label: "정상가", kind: "listPrice", aliases: ["할인전가격", "정가"] },
  { key: "stock", label: "재고", kind: "stock", required: true, aliases: ["재고수량"] },
  { key: "description", label: "설명", kind: "description", aliases: ["상품설명"] },
  { key: "is_used", label: "중고", kind: "bool", aliases: ["중고여부", "중고상품"] },
  { key: "active", label: "판매공개", kind: "bool", aliases: ["공개", "공개여부"] },
  { key: "sold_out", label: "품절", kind: "bool", aliases: ["품절여부", "품절표시"] },
  { key: "badges", label: "배지", kind: "badges", aliases: ["상품배지"] },
  // 호환성 규격 열: lib/specs.ts 정의에서 생성 (폼 표시 이름도 열 이름으로 인정)
  ...SPEC_FIELDS.map((f): Column => ({ key: f.key, label: f.csv, kind: "spec", field: f, aliases: [f.label, ...(legacySpecAliases[f.key] || [])] })),
];
const labelOf = Object.fromEntries(COLUMNS.map(c => [c.key, c.label]));
// 열 이름 비교: 공백·*·괄호 설명 무시, 영문 대소문자 무시. 예) "판매가 (원) *" = "판매가"
const normalizeHeader = (h: string) => h.normalize("NFC").replace(/\(.*?\)/g, "").replace(/[\s*_]/g, "").toLowerCase();
const headerIndex = new Map<string, Column>();
for (const c of COLUMNS) for (const name of [c.label, c.key, ...(c.aliases || [])]) headerIndex.set(normalizeHeader(name), c);

export class CsvFileError extends Error {}

// 1) 파일 형식·크기·인코딩 검사. UTF-8(BOM 포함) 우선, 아니면 한국어 Windows 엑셀 기본값 CP949(EUC-KR 확장)
export async function readCsvFile(value: FormDataEntryValue | null): Promise<{ text: string; encoding: string }> {
  if (!(value instanceof File) || (value.size === 0 && !value.name)) throw new CsvFileError("CSV 파일을 선택하세요.");
  if (!/\.csv$/i.test(value.name)) throw new CsvFileError("확장자가 .csv 인 파일만 올릴 수 있습니다.");
  if (value.size === 0) throw new CsvFileError("빈 파일입니다.");
  if (value.size > CSV_MAX_BYTES) throw new CsvFileError("CSV 파일은 1MB 이하만 올릴 수 있습니다. 나누어 올려 주세요.");
  // 윈도우는 CSV를 application/vnd.ms-excel 로 보내기도 함
  if (value.type && !["text/csv", "application/vnd.ms-excel", "text/plain", "application/csv", "text/comma-separated-values", "application/octet-stream"].includes(value.type))
    throw new CsvFileError(`CSV 형식이 아닙니다 (${value.type}).`);
  const bytes = Buffer.from(await value.arrayBuffer());
  if (bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) || bytes.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])))
    throw new CsvFileError("엑셀 통합문서(xlsx/xls) 파일입니다. 엑셀에서 '다른 이름으로 저장' → 'CSV UTF-8(쉼표로 분리)'로 저장하세요.");
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))
    throw new CsvFileError("유니코드 텍스트(UTF-16) 파일입니다. 'CSV UTF-8(쉼표로 분리)'로 저장하세요.");
  if (bytes.includes(0)) throw new CsvFileError("텍스트 CSV 파일이 아닙니다.");
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { text: decodeUtf8(bytes.subarray(3))!, encoding: "UTF-8 (BOM)" };
  const utf8 = decodeUtf8(bytes);
  if (utf8 !== null) return { text: utf8, encoding: "UTF-8" };
  const korean = iconv.decode(bytes, "cp949");
  if (korean.includes("�")) throw new CsvFileError("파일 인코딩을 알 수 없습니다. 'CSV UTF-8(쉼표로 분리)'로 다시 저장하세요.");
  return { text: korean, encoding: "한국어 (CP949/EUC-KR)" };
}
function decodeUtf8(bytes: Uint8Array) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return null; }
}

// 2) RFC 4180 CSV 해석: 쉼표 구분, "따옴표" 안의 쉼표·줄바꿈·"" 허용
export function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") { record.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(cell); records.push(record); record = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw new CsvFileError("닫히지 않은 따옴표(\")가 있습니다. 파일 내용을 확인하세요.");
  if (cell !== "" || record.length) { record.push(cell); records.push(record); }
  return records;
}

export type ProductPayload = { slug: string; name: string; category: Category; description: string; price: number; list_price: number | null; stock: number; is_used: boolean; active: boolean; sold_out: boolean; badges: string[]; specs: Specs };
type CsvRow = { row: number; values: Partial<Record<string, string | number | boolean>>; errors: string[] };

// 3) 열 이름과 각 칸의 값 검사. 행 번호는 엑셀 화면의 행 번호(제목 행 = 1)
export function validateRows(records: string[][]): { rows: CsvRow[]; columns: Column[] } {
  if (!records.length) throw new CsvFileError("파일에 내용이 없습니다.");
  const header = records[0];
  if (header.length === 1 && /[\t;]/.test(header[0])) throw new CsvFileError("쉼표(,)로 구분된 CSV가 아닙니다. 탭·세미콜론 구분 파일은 지원하지 않습니다.");
  const columns: Column[] = [], unknown: string[] = [], seen = new Set<string>();
  header.forEach((raw, i) => {
    const name = raw.trim();
    const col = headerIndex.get(normalizeHeader(name));
    if (!col) { if (name) unknown.push(name); else if (records.slice(1).some(r => (r[i] || "").trim())) unknown.push(`(${i + 1}번째 열 이름 없음)`); columns.push({ key: "", label: "", kind: "description" }); return; }
    if (seen.has(col.key)) throw new CsvFileError(`열 이름이 중복되었습니다: ${col.label}`);
    seen.add(col.key); columns.push(col);
  });
  if (unknown.length) throw new CsvFileError(`알 수 없는 열 이름: ${unknown.join(", ")}. 허용되는 열: ${COLUMNS.map(c => c.label).join(", ")}`);
  const missing = COLUMNS.filter(c => c.required && !seen.has(c.key));
  if (missing.length) throw new CsvFileError(`필수 열이 없습니다: ${missing.map(c => c.label).join(", ")}`);
  const body = records.slice(1).map((cells, i) => ({ cells, row: i + 2 })).filter(r => r.cells.some(c => c.trim()));
  if (!body.length) throw new CsvFileError("제목 행 아래에 상품 데이터가 없습니다.");
  if (body.length > CSV_MAX_ROWS) throw new CsvFileError(`한 번에 최대 ${CSV_MAX_ROWS}개 상품까지 올릴 수 있습니다. (현재 ${body.length}개)`);

  const rows = body.map(({ cells, row }) => {
    const out: CsvRow = { row, values: {}, errors: [] };
    if (cells.length > header.length) out.errors.push(`칸 수(${cells.length})가 제목 행(${header.length})보다 많습니다. 값 안의 쉼표는 따옴표로 감싸야 합니다.`);
    columns.forEach((col, i) => {
      if (!col.key) return;
      const raw = (cells[i] || "").trim();
      if (!raw) { if (col.required) out.errors.push(`${col.label}: 값이 비어 있습니다.`); return; }
      const result = parseValue(col, raw);
      if (typeof result === "object" && "error" in result) out.errors.push(`${col.label}: ${result.error} (입력값: ${raw.slice(0, 40)})`);
      else out.values[col.key] = result;
    });
    return out;
  });
  // 파일 안 상품코드 중복
  const bySlug = new Map<string, number[]>();
  for (const r of rows) if (typeof r.values.slug === "string") bySlug.set(r.values.slug, [...(bySlug.get(r.values.slug) || []), r.row]);
  for (const r of rows) {
    const same = bySlug.get(r.values.slug as string);
    if (same && same.length > 1) r.errors.push(`상품코드가 파일 안에서 중복됩니다 (${same.join(", ")}행).`);
  }
  return { rows, columns: columns.filter(c => c.key) };
}

const yes = ["y", "yes", "예", "o", "true", "1", "공개", "중고"], no = ["n", "no", "아니오", "아니요", "x", "false", "0", "비공개", "신품", "새제품"];
function parseValue(col: Column, raw: string): string | number | boolean | { error: string } {
  switch (col.kind) {
    case "slug": return /^[a-z0-9-]{3,90}$/.test(raw) ? raw : { error: "영문 소문자·숫자·하이픈(-) 3~90자만 가능합니다" };
    case "name": return raw.length >= 2 && raw.length <= 160 ? raw : { error: "2~160자여야 합니다" };
    case "category": return (categories as readonly string[]).includes(raw) ? raw : { error: `허용 카테고리: ${categories.join(", ")}` };
    case "price": return money(raw, 1_000_000_000, "0원 이상 10억원 이하 정수(원 단위)만 가능합니다");
    case "stock": return money(raw, 1_000_000, "0 이상 1,000,000 이하 정수만 가능합니다");
    // 정상가: 지우려면 "없음". 판매가보다 커야 하는 검사는 buildPlan 에서 (판매가와 함께 비교)
    case "listPrice": return /^(없음|none)$/i.test(raw) ? "" : money(raw, 1_000_000_000, "0원 이상 10억원 이하 정수(원 단위)만 가능합니다");
    case "spec": return parseSpecValue(col.field!, raw) ?? { error: "값이 비어 있습니다" };
    // 배지: 쉼표·슬래시 구분. 모두 지우려면 "없음"
    case "badges": {
      if (/^(없음|none)$/i.test(raw)) return "";
      const list = parseBadges(raw.split(/[,/]/));
      return "error" in list ? { error: list.error } : list.join(",");
    }
    case "description": return raw.length <= 2000 ? raw : { error: "2000자 이하만 가능합니다" };
    case "bool": {
      const v = raw.toLowerCase();
      return yes.includes(v) ? true : no.includes(v) ? false : { error: "Y 또는 N으로 입력하세요" };
    }
  }
}
// "1,234,000", "1234000원" 허용. 소수·음수·지수 표기(1.2E+06) 거부
function money(raw: string, max: number, error: string) {
  const s = raw.replace(/[,\s]/g, "").replace(/원$/, "");
  if (!/^\d+$/.test(s)) return { error };
  const n = Number(s);
  return Number.isSafeInteger(n) && n <= max ? n : { error };
}

export type ExistingProduct = ProductPayload & { id: string };
export type PlanStatus = "new" | "update" | "same" | "error";
export type PlanRow = { row: number; slug: string; name: string; status: PlanStatus; changes: { field: string; before: string; after: string }[]; errors: string[] };
export type ImportPlan = { rows: PlanRow[]; payloads: ProductPayload[]; summary: Record<PlanStatus, number>; token: string };
const SPEC_KEYS = COLUMNS.filter(c => c.kind === "spec").map(c => c.key);
const show = (key: string, v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length) ? "(없음)" : Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Y" : "N") : (key === "price" || key === "list_price" || key === "stock") ? Number(v).toLocaleString("ko-KR") : String(v);

// 4) DB 기존 상품과 비교. 빈 칸 = 기존 값 유지(신규는 기본값). 새 상품의 판매공개 기본값은 N(비공개)
export function buildPlan(rows: CsvRow[], existing: Map<string, ExistingProduct>, mode: ImportMode): ImportPlan {
  const plan: PlanRow[] = [], payloads: ProductPayload[] = [];
  for (const r of rows) {
    const v = r.values, slug = String(v.slug ?? ""), old = existing.get(slug);
    const item: PlanRow = { row: r.row, slug, name: String(v.name ?? old?.name ?? ""), status: "error", changes: [], errors: [...r.errors] };
    if (old && mode === "insert") item.errors.push("이미 등록된 상품코드입니다. 기존 상품을 수정하려면 '신규 등록 + 기존 상품 수정'을 선택하세요.");
    if (item.errors.length) { plan.push(item); continue; }
    const specs: Specs = { ...(old?.specs || {}) };
    for (const k of SPEC_KEYS) if (v[k] !== undefined) (specs as Record<string, unknown>)[k] = v[k];
    const payload: ProductPayload = {
      slug, name: String(v.name), category: v.category as Category, price: v.price as number, stock: v.stock as number,
      list_price: v.list_price === "" ? null : typeof v.list_price === "number" ? v.list_price : old?.list_price ?? null,
      description: (v.description as string | undefined) ?? old?.description ?? "",
      is_used: (v.is_used as boolean | undefined) ?? old?.is_used ?? false,
      active: (v.active as boolean | undefined) ?? old?.active ?? false,
      sold_out: (v.sold_out as boolean | undefined) ?? old?.sold_out ?? false,
      badges: typeof v.badges === "string" ? (v.badges ? v.badges.split(",") : []) : old?.badges ?? [],
      specs,
    };
    // '중고' 배지 → 중고상품으로 저장 (배지 목록에서는 뺌)
    { const u = splitUsedBadge(payload.badges); payload.badges = u.badges; if (u.used) payload.is_used = true; }
    // 정상가는 (CSV 값 또는 기존 값) 판매가보다 커야 함. 판매가만 올려 기존 정상가보다 커진 경우도 여기서 잡힘
    const listError = checkListPrice(payload.list_price, payload.price);
    if (listError) { item.errors.push(listError); plan.push(item); continue; }
    // 비교: 배열은 내용으로, 값 없음(undefined)과 null 은 같은 것으로
    const same = (a: unknown, b: unknown) => Array.isArray(a) || Array.isArray(b) ? (Array.isArray(a) ? a : []).join(",") === (Array.isArray(b) ? b : []).join(",") : (a ?? null) === (b ?? null);
    // 새 상품: 비어 있는 선택 항목(설명·배지·품절·정상가)은 변경 내용에 표시하지 않음
    const shownForNew = (key: string) => key === "description" ? !!payload.description : key === "badges" ? payload.badges.length > 0 : key === "sold_out" ? payload.sold_out : key === "list_price" ? payload.list_price !== null : true;
    for (const key of ["name", "category", "price", "list_price", "stock", "description", "is_used", "active", "sold_out", "badges"] as const)
      if (!old || !same(old[key], payload[key])) if (old || shownForNew(key))
        item.changes.push({ field: labelOf[key], before: old ? show(key, old[key]) : "", after: show(key, payload[key]) });
    for (const k of SPEC_KEYS) {
      const before = (old?.specs as Record<string, unknown> | undefined)?.[k], after = (specs as Record<string, unknown>)[k];
      if (before !== after) item.changes.push({ field: labelOf[k], before: old ? show(k, before) : "", after: show(k, after) });
    }
    item.status = !old ? "new" : item.changes.length ? "update" : "same";
    if (item.status !== "same") payloads.push(payload);
    plan.push(item);
  }
  const summary = { new: 0, update: 0, same: 0, error: 0 } as Record<PlanStatus, number>;
  for (const p of plan) summary[p.status]++;
  // 미리보기와 반영 시점의 계획이 같은지 확인하는 지문 (그사이 DB나 파일이 바뀌면 달라짐)
  const token = createHash("sha256").update(JSON.stringify({ mode, plan, payloads })).digest("hex");
  return { rows: plan, payloads, summary, token };
}

export function csvTemplate() {
  // 예시 2행: 완제품 1개, 조립용 부품(메인보드) 1개
  const examples: Record<string, string>[] = [
    { slug: "ryzen5-5600-office", name: "라이젠5 5600 사무용PC", category: "완제품", price: "479,000", list_price: "529,000", stock: "3", description: "사무·인강용 추천 구성", is_used: "N", active: "Y", badges: "인기,특가", cpu: "Ryzen 5 5600", ram: "16GB DDR4", graphics: "내장그래픽", storage: "NVMe 500GB" },
    { slug: "b650m-ddr5-board", name: "B650M DDR5 메인보드", category: "메인보드", price: "170,000", stock: "2", is_used: "N", active: "N", socket: "AM5", memory_type: "DDR5", form_factor: "mATX", bios_supported_series: "Ryzen 7000,Ryzen 8000", bios_update_series: "Ryzen 9000", cpu_power_connectors: "EPS8x1" },
  ];
  const quote = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return [COLUMNS.map(c => c.label), ...examples.map(e => COLUMNS.map(c => e[c.key] || ""))].map(r => r.map(quote).join(",")).join("\r\n") + "\r\n";
}
