import type { Product } from "@/lib/types";
// 상품 배지와 판매 가능 여부 (고객 화면·장바구니·견적·관리자 공용). 값 목록은 supabase/product_badges.sql 의 제약과 같아야 함
export const BADGES = [
  { key: "인기", cls: "hot", help: "많이 찾는 상품" },
  { key: "임박", cls: "soon", help: "품절·행사 마감 임박" },
  { key: "NEW", cls: "new", help: "신상품" },
  { key: "특가", cls: "sale", help: "할인 행사 가격" },
  { key: "한정수량", cls: "limited", help: "수량 한정 판매 (남은 재고 수량 함께 표시)" },
  { key: "중고", cls: "used", help: "중고상품 체크와 같음" },
] as const;
export type BadgeKey = (typeof BADGES)[number]["key"];
const badgeKeys: readonly string[] = BADGES.map(b => b.key);
// 화면 표시 순서를 BADGES 순서로 맞추고 모르는 값은 버림
// '중고' 배지는 DB 배지 목록이 아니라 중고상품 여부로 표시 (중고상품 체크 또는 중고PC 카테고리). 예전에 저장된 '중고' 배지도 그대로 표시
export const isUsedProduct = (p: Pick<Product, "is_used" | "category">) => Boolean(p.is_used) || p.category === "중고PC";
export const productBadges = (p: Pick<Product, "badges" | "is_used" | "category">) => BADGES.filter(b => (p.badges || []).includes(b.key) || (b.key === "중고" && isUsedProduct(p)));
// 저장용: '중고' 배지는 중고상품 체크로 바꾸고 배지 목록에서는 뺌 (DB 배지 허용 목록과 관계없이 항상 저장되도록)
export function splitUsedBadge(list: string[]): { badges: string[]; used: boolean } {
  return { badges: list.filter(b => b !== "중고"), used: list.includes("중고") };
}
export function parseBadges(values: string[]): BadgeKey[] | { error: string } {
  const list = [...new Set(values.map(v => v.trim()).filter(Boolean).map(v => v.toUpperCase() === "NEW" ? "NEW" : v))];
  const bad = list.filter(v => !badgeKeys.includes(v));
  return bad.length ? { error: `허용되지 않는 배지: ${bad.join(", ")} (가능: ${badgeKeys.join(", ")})` } : list as BadgeKey[];
}
// 할인율(%): 정상가가 판매가보다 높을 때만, 소수점 버림. 정상가 없음·판매가 이하 → 0 (할인 표시 안 함)
export const discountRate = (p: Pick<Product, "price" | "list_price">) =>
  typeof p.list_price === "number" && p.list_price > p.price && p.list_price > 0 ? Math.floor((p.list_price - p.price) / p.list_price * 100) : 0;
// 정상가 입력 검사 (관리자 폼·CSV 공용). 빈 값 = 정상가 없음(null)
export function checkListPrice(listPrice: number | null, price: number): string | null {
  return listPrice !== null && listPrice <= price ? `정상가(${listPrice.toLocaleString("ko-KR")}원)는 판매가(${price.toLocaleString("ko-KR")}원)보다 커야 합니다. 할인하지 않으면 비워 두세요.` : null;
}
// 품절: 관리자가 품절로 지정했거나 재고 0. 품절 상품은 장바구니·견적·주문 불가
export const isSoldOut = (p: Pick<Product, "sold_out" | "stock">) => Boolean(p.sold_out) || p.stock <= 0;
export const soldOutReason = (p: Pick<Product, "sold_out" | "stock">) => p.sold_out ? "판매자가 품절 처리한 상품입니다." : "재고가 없는 상품입니다.";
