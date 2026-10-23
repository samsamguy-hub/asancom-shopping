// 장바구니 공통 규칙 (브라우저·서버 공용, 서버 전용 코드 import 금지)
// 브라우저에는 상품 id와 수량만 저장. 가격·상품명·재고는 항상 서버가 DB에서 다시 읽음 (브라우저 값은 신뢰하지 않음)
import type { ShippingOption } from "@/lib/pricing";
export const MAX_QTY_PER_ITEM = 99;
export const MAX_CART_LINES = 30;
export type CartItem = { productId: string; quantity: number };
const idPattern = /^[0-9a-z-]{1,64}$/;

// 저장소·요청에서 읽은 값을 안전한 형태로 정리: 형식 오류 제거, 같은 상품 합치기, 개수 제한
// 수량 상한(재고·1회 최대)은 여기서 자르지 않고 서버 검증에서 '조정'으로 알려줌
export function sanitizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, number>();
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const { productId, quantity } = v as Record<string, unknown>;
    if (typeof productId !== "string" || !idPattern.test(productId)) continue;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1) continue;
    merged.set(productId, Math.min((merged.get(productId) || 0) + quantity, 999));
  }
  return [...merged].slice(0, MAX_CART_LINES).map(([productId, quantity]) => ({ productId, quantity }));
}

// 서버 검증 결과 한 줄
//  ok          : 요청 수량 그대로 구매 가능
//  adjusted    : 재고(또는 1회 최대 수량)보다 많아 quantity 를 줄여서 계산함 → 고객 확인 필요
//  sold_out    : 재고 0 → 합계에서 제외
//  unavailable : 판매 중지·삭제된 상품 → 합계에서 제외
export type CartLineStatus = "ok" | "adjusted" | "sold_out" | "unavailable";
export type PricedLine = {
  productId: string; requested: number; quantity: number; status: CartLineStatus; message?: string;
  name?: string; slug?: string; category?: string; unitPrice?: number; stock?: number;
  maxQuantity: number; lineTotal: number; imageUrl?: string; imageAlt?: string;
};
// 금액(모두 원): subtotal 상품 공급가 합계 / shippingFee 배송·설치비(공급가) / supplyTotal 공급가 합계 / vat 부가세 10% / total 최종 금액
// fingerprint: (상품 id, 수량, 단가, 배송 방법, 부가세, 최종 금액)의 해시. 이후 주문 생성 시 서버가 다시 계산해 고객이 본 금액과 같은지 비교
export type PricedCart = {
  lines: PricedLine[]; itemCount: number; subtotal: number;
  shippingOptions: ShippingOption[]; shipping: ShippingOption | null; shippingMessage?: string; shippingFee: number;
  supplyTotal: number; vat: number; total: number;
  orderable: boolean; fingerprint: string; checkedAt: string;
};
