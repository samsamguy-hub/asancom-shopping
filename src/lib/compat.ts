import type { Category, Product, Specs } from "@/lib/types";
import { formatConnectors, norm, parseConnectors, specLabel, splitList, type ConnectorType, type Connectors } from "@/lib/specs";

// 조립PC 호환성 검사 (브라우저 견적 화면과 이후 서버 견적 저장에서 같이 사용하는 순수 함수)
// 원칙: 판단에 필요한 규격이 하나라도 없으면 호환으로 보지 않고 "확인 필요(unknown)"
export const BUILD_SLOTS = [
  { key: "cpu", category: "CPU", required: true },
  { key: "board", category: "메인보드", required: true },
  { key: "memory", category: "메모리", required: true },
  { key: "gpu", category: "그래픽카드", required: true },
  { key: "ssd", category: "SSD", required: true },
  { key: "psu", category: "파워", required: true },
  { key: "case", category: "케이스", required: true },
  { key: "cooler", category: "CPU쿨러", required: false },
] as const satisfies readonly { key: string; category: Category; required: boolean }[];
export type SlotKey = (typeof BUILD_SLOTS)[number]["key"];
export type BuildParts = Partial<Record<SlotKey, Product>>;
export type CheckStatus = "ok" | "warn" | "unknown" | "fail";
export type Check = { id: string; title: string; status: CheckStatus; messages: string[] };
export type BuildResult = { overall: "incomplete" | "fail" | "needs_check" | "ok"; missingParts: Category[]; checks: Check[] };
export const statusText: Record<CheckStatus, string> = { ok: "호환", warn: "주의", unknown: "확인 필요", fail: "비호환" };
// 메인보드·메모리·SSD·팬 등 CPU/그래픽카드 외 부품의 대략적 소비전력, 권장 여유율
export const BASE_SYSTEM_W = 100, PSU_HEADROOM = 1.3;
// 판정 기준(규칙)이 바뀌면 올림. 저장된 견적이 어떤 기준으로 검사되었는지 기록하는 용도
export const COMPAT_RULES_VERSION = 1;

type Sub = { status: CheckStatus; message: string };
const rank: Record<CheckStatus, number> = { ok: 0, unknown: 1, warn: 2, fail: 3 };
const worst = (subs: Sub[]): CheckStatus => subs.reduce<CheckStatus>((w, s) => rank[s.status] > rank[w] ? s.status : w, "ok");
const ok = (message: string): Sub => ({ status: "ok", message });
const fail = (message: string): Sub => ({ status: "fail", message });
const warn = (message: string): Sub => ({ status: "warn", message });
const unknown = (message: string): Sub => ({ status: "unknown", message });
const missing = (part: string, ...keys: (keyof Specs)[]) => unknown(`${part}의 ${keys.map(k => `'${specLabel(k)}'`).join(", ")} 정보가 없어 확인이 필요합니다.`);
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : undefined;
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : undefined;
const has = (list: string[], value: string) => list.some(x => norm(x) === norm(value));
const shown = (list: string[]) => list.length ? list.join(", ") : "없음";

function socket(cpu: Product, board: Product): Sub[] {
  const a = str(cpu.specs.socket), b = str(board.specs.socket);
  if (!a || !b) return [...(!a ? [missing("CPU", "socket")] : []), ...(!b ? [missing("메인보드", "socket")] : [])];
  return [norm(a) === norm(b) ? ok(`소켓 일치 (${a})`) : fail(`CPU 소켓(${a})과 메인보드 소켓(${b})이 다릅니다.`)];
}

function memory(cpu: Product, board: Product, mem: Product): Sub[] {
  const m = splitList(mem.specs.memory_type), out: Sub[] = [];
  if (!m?.length) return [missing("메모리", "memory_type")];
  for (const [part, p] of [["메인보드", board], ["CPU", cpu]] as const) {
    const list = splitList(p.specs.memory_type);
    if (!list?.length) out.push(missing(part, "memory_type"));
    else out.push(m.some(x => has(list, x)) ? ok(`${part} 메모리 규격 일치 (${m.join(", ")})`) : fail(`${part}(${list.join(", ")})는 메모리(${m.join(", ")})를 지원하지 않습니다.`));
  }
  return out;
}

function bios(cpu: Product, board: Product): Sub[] {
  const series = str(cpu.specs.cpu_series);
  const now = splitList(board.specs.bios_supported_series), later = splitList(board.specs.bios_update_series);
  if (!series) return [missing("CPU", "cpu_series")];
  if (!now && !later) return [missing("메인보드", "bios_supported_series", "bios_update_series")];
  if (now && has(now, series)) return [ok(`현재 BIOS로 ${series} 지원`)];
  if (later && has(later, series)) return [warn(`${series}는 메인보드 BIOS 업데이트 후 지원됩니다. 조립 전 BIOS 업데이트가 필요합니다(매장 업데이트 가능 여부 확인).`)];
  // 목록에 없다고 미지원으로 단정하지 않음 (목록 누락 가능)
  return [unknown(`메인보드 BIOS 지원 목록에 '${series}'가 없습니다. 제조사 CPU 지원 목록으로 확인이 필요합니다.`)];
}

function cooler(cpu: Product, pcCase: Product, cool?: Product): Sub[] {
  if (!cool) {
    const included = cpu.specs.cooler_included;
    if (included === undefined) return [missing("CPU", "cooler_included")];
    return [included ? ok("CPU 기본 쿨러 사용") : fail("이 CPU에는 기본 쿨러가 없습니다. CPU쿨러를 선택하세요.")];
  }
  const out: Sub[] = [];
  const sockets = splitList(cool.specs.cooler_sockets), cpuSocket = str(cpu.specs.socket);
  if (!sockets?.length) out.push(missing("CPU쿨러", "cooler_sockets"));
  else if (!cpuSocket) out.push(missing("CPU", "socket"));
  else out.push(has(sockets, cpuSocket) ? ok(`쿨러가 ${cpuSocket} 소켓 지원`) : fail(`쿨러 지원 소켓(${sockets.join(", ")})에 CPU 소켓(${cpuSocket})이 없습니다.`));
  const tdp = num(cool.specs.cooler_tdp_w), cpuW = num(cpu.specs.power_w);
  if (tdp === undefined || cpuW === undefined) out.push(tdp === undefined ? missing("CPU쿨러", "cooler_tdp_w") : missing("CPU", "power_w"));
  else out.push(tdp >= cpuW ? ok(`냉각 성능 ${tdp}W ≥ CPU ${cpuW}W`) : warn(`쿨러 냉각 성능(${tdp}W)이 CPU 소비전력(${cpuW}W)보다 낮습니다.`));
  const type = str(cool.specs.cooler_type);
  if (!type) out.push(missing("CPU쿨러", "cooler_type"));
  else if (type === "공랭") {
    const h = num(cool.specs.cooler_height_mm), max = num(pcCase.specs.max_cooler_height_mm);
    if (h === undefined || max === undefined) out.push(h === undefined ? missing("CPU쿨러", "cooler_height_mm") : missing("케이스", "max_cooler_height_mm"));
    else out.push(h <= max ? ok(`쿨러 높이 ${h}mm ≤ 케이스 허용 ${max}mm`) : fail(`쿨러 높이(${h}mm)가 케이스 허용 높이(${max}mm)를 넘습니다.`));
  } else {
    const r = num(cool.specs.radiator_mm), sizes = splitList(pcCase.specs.radiator_sizes);
    if (r === undefined || !sizes) out.push(r === undefined ? missing("CPU쿨러", "radiator_mm") : missing("케이스", "radiator_sizes"));
    else out.push(has(sizes, String(r)) ? ok(`${r}mm 라디에이터 장착 가능`) : fail(`케이스에 ${r}mm 라디에이터를 장착할 수 없습니다 (가능: ${shown(sizes)}).`));
  }
  return out;
}

function gpuSize(gpu: Product, pcCase: Product): Sub[] {
  const out: Sub[] = [];
  const len = num(gpu.specs.gpu_length_mm), maxLen = num(pcCase.specs.max_gpu_length_mm);
  if (len === undefined || maxLen === undefined) out.push(len === undefined ? missing("그래픽카드", "gpu_length_mm") : missing("케이스", "max_gpu_length_mm"));
  else out.push(len <= maxLen ? ok(`길이 ${len}mm ≤ 케이스 허용 ${maxLen}mm`) : fail(`그래픽카드 길이(${len}mm)가 케이스 허용 길이(${maxLen}mm)를 넘습니다.`));
  const slots = num(gpu.specs.gpu_slots), maxSlots = num(pcCase.specs.max_gpu_slots);
  if (slots === undefined || maxSlots === undefined) out.push(slots === undefined ? missing("그래픽카드", "gpu_slots") : missing("케이스", "max_gpu_slots"));
  else out.push(slots <= maxSlots ? ok(`두께 ${slots}슬롯 ≤ 케이스 허용 ${maxSlots}슬롯`) : fail(`그래픽카드 두께(${slots}슬롯)가 케이스 허용(${maxSlots}슬롯)을 넘습니다.`));
  return out;
}

function caseFit(board: Product, psu: Product, pcCase: Product): Sub[] {
  const out: Sub[] = [];
  for (const [part, p, key, caseKey] of [["메인보드", board, "form_factor", "mb_form_factors"], ["파워", psu, "psu_form_factor", "psu_form_factors"]] as const) {
    const v = str(p.specs[key]), list = splitList(pcCase.specs[caseKey]);
    if (!v || !list) out.push(!v ? missing(part, key) : missing("케이스", caseKey));
    else out.push(has(list, v) ? ok(`${part} ${v} 장착 가능`) : fail(`케이스는 ${part} ${v} 규격을 지원하지 않습니다 (지원: ${shown(list)}).`));
  }
  return out;
}

function psuCapacity(cpu: Product, gpu: Product, psu: Product): Sub[] {
  const c = num(cpu.specs.power_w), g = num(gpu.specs.power_w), p = num(psu.specs.power_w);
  if (c === undefined || g === undefined || p === undefined)
    return [...(c === undefined ? [missing("CPU", "power_w")] : []), ...(g === undefined ? [missing("그래픽카드", "power_w")] : []), ...(p === undefined ? [missing("파워", "power_w")] : [])];
  const estimate = c + g + BASE_SYSTEM_W, recommended = Math.ceil(estimate * PSU_HEADROOM / 50) * 50;
  const detail = `추정 소비전력 ${estimate}W, 권장 ${recommended}W 이상, 선택 파워 ${p}W`;
  return [p < estimate ? fail(`파워 용량 부족: ${detail}`) : p < recommended ? warn(`파워 용량 여유 부족: ${detail}`) : ok(detail)];
}

function psuConnectors(board: Product, gpu: Product, psu: Product): Sub[] {
  const raw = { board: str(board.specs.cpu_power_connectors), gpu: str(gpu.specs.gpu_power_connectors), psu: str(psu.specs.psu_connectors) };
  const parsed = { board: raw.board ? parseConnectors(raw.board) : null, gpu: raw.gpu ? parseConnectors(raw.gpu) : null, psu: raw.psu ? parseConnectors(raw.psu) : null };
  const lacking = [...(!parsed.board ? [missing("메인보드", "cpu_power_connectors")] : []), ...(!parsed.gpu ? [missing("그래픽카드", "gpu_power_connectors")] : []), ...(!parsed.psu ? [missing("파워", "psu_connectors")] : [])];
  if (lacking.length) return lacking;
  const need: Connectors = {};
  for (const src of [parsed.board!, parsed.gpu!]) for (const [t, n] of Object.entries(src) as [ConnectorType, number][]) need[t] = (need[t] || 0) + n;
  const left: Connectors = { ...parsed.psu! };
  const take = (t: ConnectorType, n: number) => { const k = Math.min(left[t] || 0, n); left[t] = (left[t] || 0) - k; return n - k; };
  const short: Connectors = {};
  // 같은 종류 먼저, 그다음 EPS4←EPS8(4+4), PCIE6←PCIE8(6+2) 대체
  for (const t of ["16PIN", "EPS8", "PCIE8", "EPS4", "PCIE6"] as const) {
    let n = take(t, need[t] || 0);
    if (t === "EPS4") n = take("EPS8", n);
    if (t === "PCIE6") n = take("PCIE8", n);
    if (n > 0) short[t] = n;
  }
  const needText = `필요 ${formatConnectors(need)} / 파워 제공 ${formatConnectors(parsed.psu!)}`;
  const { "16PIN": short16 = 0, ...otherShort } = short;
  const out: Sub[] = [];
  if (Object.keys(otherShort).length) out.push(fail(`파워 커넥터 부족 (${formatConnectors(otherShort)}). ${needText}`));
  // 16핀 부족: 8핀 여러 개 → 16핀 변환 어댑터(보통 8핀 2~4개)로 가능할 수 있으나 단정하지 않음
  if (short16) out.push((left.PCIE8 || 0) >= 2 * short16 ? warn(`파워에 16핀 커넥터가 없어 변환 어댑터가 필요합니다 (그래픽카드 동봉 여부와 8핀 개수 확인). ${needText}`) : fail(`16핀 커넥터가 부족하고 변환에 쓸 8핀도 부족합니다. ${needText}`));
  if (!out.length) out.push(ok(needText));
  return out;
}

export function checkBuild(parts: BuildParts): BuildResult {
  const missingParts = BUILD_SLOTS.filter(s => s.required && !parts[s.key]).map(s => s.category);
  const { cpu, board, memory: mem, gpu, psu, case: pcCase, cooler: cool } = parts;
  const checks: Check[] = [];
  const add = (id: string, title: string, subs: Sub[] | null) => { if (subs) checks.push({ id, title, status: worst(subs), messages: subs.map(s => s.message) }); };
  // 관련 부품이 모두 선택된 항목만 검사
  add("socket", "CPU 소켓", cpu && board ? socket(cpu, board) : null);
  add("memory", "메모리(DDR) 규격", cpu && board && mem ? memory(cpu, board, mem) : null);
  add("bios", "메인보드 BIOS 지원", cpu && board ? bios(cpu, board) : null);
  add("cooler", "CPU 쿨러", cpu && pcCase ? cooler(cpu, pcCase, cool) : null);
  add("gpu_size", "그래픽카드 크기", gpu && pcCase ? gpuSize(gpu, pcCase) : null);
  add("case_fit", "케이스 장착 규격", board && psu && pcCase ? caseFit(board, psu, pcCase) : null);
  add("psu_capacity", "파워 용량", cpu && gpu && psu ? psuCapacity(cpu, gpu, psu) : null);
  add("psu_connectors", "파워 커넥터", board && gpu && psu ? psuConnectors(board, gpu, psu) : null);
  const overall = missingParts.length ? "incomplete" : checks.some(c => c.status === "fail") ? "fail" : checks.some(c => c.status !== "ok") ? "needs_check" : "ok";
  return { overall, missingParts, checks };
}
