import { partCategories } from "@/lib/types";
// 관리자 상품 검색: Supabase(PostgREST) or 조건 문자열을 만들어 서버 조회 단계에서 검색 + 페이지 나누기를 함께 처리
// 대상: 상품명(제품번호 포함)·URL 이름·설명·카테고리(대소문자 무시, 부분 일치) + 상품 ID(전체 일치) + 고객 메뉴 이름(중고컴퓨터 → 중고PC 등)
const MENU_CATEGORIES: Record<string, readonly string[]> = {
  "조립컴퓨터": ["완제품"], "조립pc": ["완제품"], "중고컴퓨터": ["중고PC"], "데스크톱세트": ["데스크톱세트"], "데스크탑세트": ["데스크톱세트"],
  "pc부품": partCategories, "부품": partCategories, "프리미엄": ["프리미엄"], "한정판": ["한정판"],
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 검색어 정리: 앞뒤 공백 제거, 100자 제한
export const cleanAdminQuery = (v: unknown) => (typeof v === "string" ? v : "").trim().replace(/\s+/g, " ").slice(0, 100);
export function adminProductSearch(q: string): string | null {
  // PostgREST 조건식에 쓰이는 특수문자는 공백으로 (검색어로 조건을 바꿀 수 없게)
  if (!q.trim()) return null;
  const s = q.replace(/[%_*,()"\\]/g, " ").replace(/\s+/g, " ").trim();
  // 특수문자만 입력 → 결과 없음 (전체 목록을 보여주지 않음)
  if (!s) return "id.eq.00000000-0000-0000-0000-000000000000";
  // 띄어쓰기 차이 흡수: RTX5070 ↔ RTX 5070, 제품번호51 ↔ 제품번호 51
  const spaced = s.replace(/([^\d\s])(\d)/g, "$1 $2").replace(/(\d)([^\d\s.\-])/g, "$1 $2");
  const variants = [...new Set([s, spaced, s.replace(/\s+/g, "")])].filter(Boolean);
  const parts = variants.flatMap(v => ["name", "slug", "description", "category"].map(f => `${f}.ilike.*${v}*`));
  const key = s.toLowerCase().replace(/\s+/g, "");
  const cats = [...new Set(Object.entries(MENU_CATEGORIES).filter(([k]) => key.includes(k)).flatMap(([, v]) => v))];
  if (cats.length) parts.push(`category.in.(${cats.map(c => `"${c}"`).join(",")})`);
  if (UUID.test(s)) parts.push(`id.eq.${s.toLowerCase()}`);
  return parts.join(",");
}
// 관리자 상품 목록 상태(검색어·페이지·방문통계 기간)만 골라 주소 조각으로. 수정 화면·삭제 후 같은 목록으로 돌아올 때 사용
export function adminListQuery(raw: unknown) {
  const src = new URLSearchParams(typeof raw === "string" ? raw : ""), out = new URLSearchParams();
  for (const k of ["q", "page", "visits"]) { const v = src.get(k); if (v) out.set(k, v.slice(0, 100)); }
  return out.toString();
}
