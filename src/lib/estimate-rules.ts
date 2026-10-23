// 견적 상담 공용 규칙 (고객 폼·서버·관리자 공용, 서버 전용 코드 없음). 분류 목록은 supabase/estimates.sql 의 제약과 같아야 함
export const ESTIMATE_CATEGORIES = ["CPU", "메인보드", "메모리", "그래픽카드", "SSD", "파워", "케이스", "CPU쿨러", "O/S", "조립선택"] as const;
export type EstimateCategory = (typeof ESTIMATE_CATEGORIES)[number];
export const isEstimateCategory = (v: string): v is EstimateCategory => (ESTIMATE_CATEGORIES as readonly string[]).includes(v);
export type EstimatePart = { id: string; category: EstimateCategory; name: string; active: boolean; sort_order: number };
export type EstimateParts = Partial<Record<EstimateCategory, string>>;
export type EstimatePost = { id: string; request_no: number; parts: EstimateParts; display_name: string; status: EstimateStatus; created_at: string };
export type EstimateContact = { request_id: string; customer_name: string; phone: string; contact_time: string; message: string; admin_memo: string | null };
export const ESTIMATE_STATUS = { received: "접수", consulting: "상담중", done: "상담완료", hidden: "숨김" } as const;
export type EstimateStatus = keyof typeof ESTIMATE_STATUS;
export const CONTACT_TIMES = ["언제든 가능", "오전 (9시~12시)", "점심 (12시~14시)", "오후 (14시~18시)", "저녁 (18시 이후)", "주말"];
export const BOARD_PAGE_SIZE = 20;
// 전화번호: 숫자만 남겨 010-1234-5678 / 041-542-3342 / 02-123-4567 형식으로. 형식이 아니면 null
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!/^0\d{8,10}$/.test(d) || (d.startsWith("010") && d.length !== 11)) return null;
  if (d.startsWith("02")) return d.length === 9 ? `02-${d.slice(2, 5)}-${d.slice(5)}` : d.length === 10 ? `02-${d.slice(2, 6)}-${d.slice(6)}` : null;
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : null;
}
// 게시판 제목: 주요 부품 2개 + 나머지 개수
export function postTitle(parts: EstimateParts) {
  const main = (["CPU", "그래픽카드", "메인보드", "메모리"] as const).map(c => parts[c]).filter(Boolean) as string[];
  const count = ESTIMATE_CATEGORIES.filter(c => parts[c]).length;
  const head = main.slice(0, 2);
  if (!head.length) return `조립PC 견적 문의 (${count}개 항목)`;
  return head.join(" + ") + (count > head.length ? ` 외 ${count - head.length}개` : "");
}
