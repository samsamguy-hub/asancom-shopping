"use server";
import { priceCart } from "@/lib/cart-server";
import type { PricedCart } from "@/lib/cart";
// 장바구니 화면이 호출: 브라우저가 보낸 값은 id·수량·배송 방법 id 만 사용하고 금액은 DB 기준으로 다시 계산 (읽기 전용, 판매 공개 상품만)
export async function refreshCart(items: unknown, shippingId?: unknown): Promise<PricedCart> {
  return priceCart(items, shippingId);
}
