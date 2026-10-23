import type { Category, Specs } from "@/lib/types";

// 조립PC 호환성 규격 정의: 관리자 상품 폼·CSV·상세페이지·견적 검사가 모두 이 목록을 사용 (products.specs jsonb 에 저장)
// 값이 비어 있으면 "정보 없음" → 견적에서 호환으로 판단하지 않고 "확인 필요"로 표시
export type SpecKind = "text" | "list" | "int" | "decimal" | "bool" | "choice" | "connectors";
export type SpecField = {
  key: keyof Specs; label: string; csv: string; kind: SpecKind; group: string; categories: Category[];
  placeholder?: string; max?: number; choices?: string[];
};
export const SPEC_FIELDS: SpecField[] = [
  { key: "socket", label: "소켓", csv: "소켓", kind: "text", group: "CPU·메인보드 공통", categories: ["CPU", "메인보드"], placeholder: "AM5, LGA1700" },
  { key: "memory_type", label: "메모리 규격", csv: "메모리규격", kind: "list", group: "CPU·메인보드 공통", categories: ["CPU", "메인보드", "메모리"], placeholder: "DDR5 (여러 개면 DDR4,DDR5)" },
  { key: "power_w", label: "소비전력·정격출력 W", csv: "전력W", kind: "int", max: 5000, group: "CPU·메인보드 공통", categories: ["CPU", "그래픽카드", "파워"], placeholder: "CPU·그래픽카드는 소비전력, 파워는 정격출력" },
  { key: "cpu_series", label: "CPU 세대 (BIOS 확인용)", csv: "CPU세대", kind: "text", group: "CPU", categories: ["CPU"], placeholder: "Ryzen 9000" },
  { key: "cooler_included", label: "기본 쿨러 포함", csv: "기본쿨러포함", kind: "bool", group: "CPU", categories: ["CPU"] },
  { key: "form_factor", label: "메인보드 크기 규격", csv: "메인보드규격", kind: "choice", choices: ["E-ATX", "ATX", "mATX", "ITX"], group: "메인보드", categories: ["메인보드"] },
  { key: "bios_supported_series", label: "현재 BIOS로 지원하는 CPU 세대", csv: "BIOS지원CPU", kind: "list", group: "메인보드", categories: ["메인보드"], placeholder: "Ryzen 7000,Ryzen 8000" },
  { key: "bios_update_series", label: "BIOS 업데이트 후 지원 CPU 세대", csv: "BIOS업데이트후지원CPU", kind: "list", group: "메인보드", categories: ["메인보드"], placeholder: "Ryzen 9000" },
  { key: "cpu_power_connectors", label: "CPU 보조전원 커넥터", csv: "CPU보조전원", kind: "connectors", group: "메인보드", categories: ["메인보드"], placeholder: "EPS8x1, EPS4x1" },
  { key: "gpu_length_mm", label: "그래픽카드 길이 mm", csv: "그래픽카드길이mm", kind: "int", max: 1000, group: "그래픽카드", categories: ["그래픽카드"] },
  { key: "gpu_slots", label: "그래픽카드 두께 (슬롯)", csv: "그래픽카드두께슬롯", kind: "decimal", max: 6, group: "그래픽카드", categories: ["그래픽카드"], placeholder: "2.5" },
  { key: "gpu_power_connectors", label: "그래픽카드 보조전원", csv: "그래픽카드보조전원", kind: "connectors", group: "그래픽카드", categories: ["그래픽카드"], placeholder: "PCIE8x2 / 16PINx1 / 없으면 NONE" },
  { key: "psu_form_factor", label: "파워 크기 규격", csv: "파워규격", kind: "choice", choices: ["ATX", "SFX", "SFX-L", "TFX"], group: "파워", categories: ["파워"] },
  { key: "psu_connectors", label: "파워 제공 커넥터", csv: "파워커넥터", kind: "connectors", group: "파워", categories: ["파워"], placeholder: "EPS8x2, PCIE8x4, 16PINx1" },
  { key: "max_gpu_length_mm", label: "그래픽카드 허용 길이 mm", csv: "케이스GPU허용길이mm", kind: "int", max: 1000, group: "케이스", categories: ["케이스"] },
  { key: "max_gpu_slots", label: "그래픽카드 허용 두께 (슬롯)", csv: "케이스GPU허용두께슬롯", kind: "decimal", max: 10, group: "케이스", categories: ["케이스"] },
  { key: "max_cooler_height_mm", label: "CPU 쿨러 허용 높이 mm", csv: "케이스쿨러허용높이mm", kind: "int", max: 300, group: "케이스", categories: ["케이스"] },
  { key: "mb_form_factors", label: "장착 가능 메인보드 규격", csv: "케이스메인보드규격", kind: "list", group: "케이스", categories: ["케이스"], placeholder: "ATX,mATX,ITX" },
  { key: "psu_form_factors", label: "장착 가능 파워 규격", csv: "케이스파워규격", kind: "list", group: "케이스", categories: ["케이스"], placeholder: "ATX" },
  { key: "radiator_sizes", label: "장착 가능 수랭 라디에이터 mm", csv: "케이스라디에이터", kind: "list", group: "케이스", categories: ["케이스"], placeholder: "240,280,360 (불가하면 NONE)" },
  { key: "cooler_type", label: "쿨러 종류", csv: "쿨러종류", kind: "choice", choices: ["공랭", "수랭"], group: "CPU쿨러", categories: ["CPU쿨러"] },
  { key: "cooler_sockets", label: "지원 소켓", csv: "쿨러지원소켓", kind: "list", group: "CPU쿨러", categories: ["CPU쿨러"], placeholder: "AM4,AM5,LGA1700,LGA1851" },
  { key: "cooler_height_mm", label: "공랭 쿨러 높이 mm", csv: "쿨러높이mm", kind: "int", max: 300, group: "CPU쿨러", categories: ["CPU쿨러"] },
  { key: "radiator_mm", label: "수랭 라디에이터 크기 mm", csv: "라디에이터mm", kind: "int", max: 480, group: "CPU쿨러", categories: ["CPU쿨러"], placeholder: "240" },
  { key: "cooler_tdp_w", label: "쿨러 냉각 성능 TDP W", csv: "쿨러TDPW", kind: "int", max: 1000, group: "CPU쿨러", categories: ["CPU쿨러"] },
  { key: "cpu", label: "완제품 CPU 표기", csv: "완제품CPU", kind: "text", group: "완제품 표시용", categories: ["완제품", "중고PC", "노트북"] },
  { key: "ram", label: "완제품 메모리 표기", csv: "완제품메모리", kind: "text", group: "완제품 표시용", categories: ["완제품", "중고PC", "노트북"] },
  { key: "graphics", label: "완제품 GPU 표기", csv: "완제품GPU", kind: "text", group: "완제품 표시용", categories: ["완제품", "중고PC", "노트북"] },
  { key: "storage", label: "완제품 저장장치 표기", csv: "완제품저장장치", kind: "text", group: "완제품 표시용", categories: ["완제품", "중고PC", "노트북"] },
];
export const specLabel = (key: string) => SPEC_FIELDS.find(f => f.key === key)?.label || key;

// 커넥터 표기: 종류x개수 를 쉼표로 구분. EPS8(CPU 4+4핀) EPS4 PCIE8(6+2핀) PCIE6 16PIN(12VHPWR·12V-2x6). 필요 없음 = NONE
export const CONNECTOR_TYPES = ["EPS8", "EPS4", "PCIE8", "PCIE6", "16PIN"] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];
export type Connectors = Partial<Record<ConnectorType, number>>;
// 이름 끝의 PIN(핀)은 떼고 비교. 예) "PCIe 8핀 x2" → PCIE8 2개, "12V-2x6" → 16PIN 1개
const connectorNames: Record<string, ConnectorType> = {
  EPS8: "EPS8", CPU8: "EPS8", "4+4": "EPS8", EPS4: "EPS4", CPU4: "EPS4",
  PCIE8: "PCIE8", "6+2": "PCIE8", "PCIE6+2": "PCIE8", PCIE6: "PCIE6",
  "16": "16PIN", "12VHPWR": "16PIN", "12V-2X6": "16PIN", "12V2X6": "16PIN",
};
const connectorName = (s: string): ConnectorType | undefined => connectorNames[s.replace(/PIN$/, "")];
export function parseConnectors(raw: string): Connectors | null {
  const s = raw.toUpperCase().replace(/\s+/g, "").replace(/핀/g, "PIN").replace(/PCI-E/g, "PCIE").replace(/[×*]/g, "X");
  if (s === "NONE" || s === "없음") return {};
  const out: Connectors = {};
  for (const token of s.split(",").filter(Boolean)) {
    let type = connectorName(token), count = 1;
    if (!type) {
      const m = token.match(/^(.+?)X(\d{1,2})$/);
      type = m ? connectorName(m[1]) : undefined;
      count = m ? Number(m[2]) : 0;
    }
    if (!type || count < 1) return null;
    out[type] = (out[type] || 0) + count;
  }
  return Object.keys(out).length ? out : null;
}
export const formatConnectors = (c: Connectors) => Object.entries(c).map(([k, n]) => `${k}x${n}`).join(", ") || "없음";

// 목록 값 비교용 정규화: 대소문자·공백·하이픈 무시, 메인보드 규격 별칭 통일
const formAlias: Record<string, string> = { microatx: "matx", "m-atx": "matx", miniitx: "itx", "mini-itx": "itx", eatx: "e-atx" };
export const norm = (v: string) => { const s = v.trim().toLowerCase().replace(/\s+/g, ""); return formAlias[s] || formAlias[s.replace(/-/g, "")] || s.replace(/-/g, ""); };
export const splitList = (v: unknown): string[] | null => {
  if (typeof v !== "string" || !v.trim()) return null;
  const items = v.split(/[,/]/).map(s => s.trim()).filter(Boolean);
  return items.length === 1 && /^(none|없음)$/i.test(items[0]) ? [] : items;
};

const yes = ["y", "yes", "예", "o", "true", "1", "포함"], no = ["n", "no", "아니오", "아니요", "x", "false", "0", "미포함"];
// 폼·CSV 입력 한 칸 검사. 빈 칸 = undefined (정보 없음)
export function parseSpecValue(field: SpecField, raw: string): string | number | boolean | undefined | { error: string } {
  const v = raw.trim();
  if (!v) return undefined;
  switch (field.kind) {
    case "text": return v.length <= 120 ? v : { error: "120자 이하만 가능합니다" };
    case "list": {
      const items = splitList(v);
      return items && v.length <= 200 ? (items.length ? items.join(",") : "NONE") : { error: "쉼표로 구분해 200자 이하로 입력하세요" };
    }
    case "int": {
      const s = v.replace(/,/g, "");
      return /^\d+$/.test(s) && Number(s) <= (field.max ?? 5000) ? Number(s) : { error: `0~${field.max ?? 5000} 정수만 가능합니다` };
    }
    case "decimal":
      return /^\d+(\.\d)?$/.test(v) && Number(v) > 0 && Number(v) <= (field.max ?? 10) ? Number(v) : { error: `0보다 크고 ${field.max ?? 10} 이하인 숫자(소수 1자리)만 가능합니다` };
    case "bool": {
      const s = v.toLowerCase();
      return yes.includes(s) ? true : no.includes(s) ? false : { error: "Y 또는 N으로 입력하세요" };
    }
    case "choice": {
      const hit = field.choices?.find(c => norm(c) === norm(v));
      return hit ?? { error: `${field.choices?.join(", ")} 중 하나만 가능합니다` };
    }
    case "connectors": {
      const c = parseConnectors(v);
      return c ? formatConnectors(c).replace("없음", "NONE") : { error: "예) EPS8x1, PCIE8x2, 16PINx1 형식으로 입력하세요 (필요 없으면 NONE)" };
    }
  }
}
// 저장된 값을 입력칸에 다시 보여줄 때
export const specInputValue = (field: SpecField, v: unknown) => v === undefined || v === null ? "" : field.kind === "bool" ? (v ? "Y" : "N") : String(v);
// 상세페이지 표시용
export const specDisplayValue = (field: SpecField | undefined, v: unknown) => typeof v === "boolean" ? (v ? "예" : "아니오") : v === "NONE" ? (field?.kind === "connectors" ? "필요 없음" : "없음") : String(v);
// 관리자 상품 폼용 너그러운 입력 정리: 형식이 조금 달라도 숫자·예/아니오·선택값을 찾아 저장 ("600W"→600, "2.5슬롯"→2.5, "있음"→예)
// 그래도 알아볼 수 없는 값은 오류 대신 { error } 를 돌려주고, 폼은 그 칸만 빼고 저장한 뒤 알려줌. CSV 일괄등록은 미리보기 검사를 위해 parseSpecValue(엄격) 사용
export function coerceSpecValue(field: SpecField, raw: string): string | number | boolean | undefined | { error: string } {
  const strict = parseSpecValue(field, raw);
  if (strict === undefined || typeof strict !== "object") return strict;
  const v = raw.trim().normalize("NFKC");
  switch (field.kind) {
    case "text": return v.slice(0, 120);
    case "list": return parseSpecValue(field, v.slice(0, 200));
    case "int": case "decimal": {
      const m = v.replace(/,/g, "").match(/\d+(\.\d+)?/);
      if (!m) return strict;
      const n = field.kind === "int" ? Math.round(Number(m[0])) : Math.round(Number(m[0]) * 10) / 10;
      return n >= (field.kind === "int" ? 0 : 0.1) && n <= (field.max ?? (field.kind === "int" ? 5000 : 10)) ? n : strict;
    }
    case "bool": {
      const s = v.toLowerCase();
      if (/미포함|불포함|없|무|아니|^no?$|^x$/.test(s)) return false;
      if (/포함|있|유|^예|^yes|^y$|^o$/.test(s)) return true;
      return strict;
    }
    case "choice": {
      // "Micro-ATX 보드"→mATX, "Mini-ITX"→ITX 처럼 별칭을 먼저 바꾼 뒤 긴 이름부터 찾음 (E-ATX·mATX 가 ATX 로 잘못 잡히지 않게)
      const flat = (x: string) => x.toLowerCase().replace(/[\s-]/g, "");
      const s = flat(v.replace(/micro\s*-?\s*atx/gi, "mATX").replace(/mini\s*-?\s*itx/gi, "ITX"));
      const hit = [...(field.choices || [])].sort((a, b) => flat(b).length - flat(a).length).find(c => s.includes(flat(c)));
      return hit ?? strict;
    }
    default: return strict;
  }
}
