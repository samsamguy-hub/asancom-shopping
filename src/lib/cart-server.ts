import { createHash } from "node:crypto";
import { getProductsByIds } from "@/lib/products";
import { MAX_QTY_PER_ITEM, sanitizeCartItems, type PricedCart, type PricedLine } from "@/lib/cart";
import { isSoldOut, soldOutReason } from "@/lib/product-status";
import { getShippingOptions } from "@/lib/shipping";
import { vatOf } from "@/lib/pricing";

// 장바구니 서버 검증: DB 현재 가격·재고·판매 여부·배송비로 다시 계산. 이후 주문 생성도 반드시 이 함수(또는 같은 규칙의 DB 함수)를 거침
// shippingId 는 브라우저가 고른 배송 방법 id 뿐이며, 금액은 DB 의 사용 중인 배송 방법에서 읽음
export async function priceCart(raw: unknown, shippingId?: unknown): Promise<PricedCart> {
  const items = sanitizeCartItems(raw);
  const [productList, shippingOptions] = await Promise.all([getProductsByIds(items.map(i => i.productId)), getShippingOptions()]);
  const products = new Map(productList.map(p => [p.id, p]));
  const lines: PricedLine[] = items.map(({ productId, quantity: requested }) => {
    const p = products.get(productId);
    if (!p) return { productId, requested, quantity: 0, status: "unavailable", message: "판매가 중지되었거나 없는 상품입니다.", maxQuantity: 0, lineTotal: 0 };
    const info = { name: p.name, slug: p.slug, category: p.category, unitPrice: p.price, stock: p.stock, imageUrl: p.images?.[0]?.url, imageAlt: p.images?.[0]?.alt_text || p.name };
    // 관리자 품절 지정 또는 재고 0 → 주문 불가
    const maxQuantity = isSoldOut(p) ? 0 : Math.min(p.stock, MAX_QTY_PER_ITEM);
    if (maxQuantity === 0) return { productId, requested, quantity: 0, status: "sold_out", message: `${soldOutReason(p)} 합계에서 제외됩니다.`, maxQuantity, lineTotal: 0, ...info };
    if (requested > maxQuantity) {
      const message = p.stock < requested ? `재고가 ${p.stock}개라 수량을 ${maxQuantity}개로 조정했습니다.` : `한 번에 최대 ${MAX_QTY_PER_ITEM}개까지 담을 수 있어 수량을 조정했습니다.`;
      return { productId, requested, quantity: maxQuantity, status: "adjusted", message, maxQuantity, lineTotal: p.price * maxQuantity, ...info };
    }
    return { productId, requested, quantity: requested, status: "ok", maxQuantity, lineTotal: p.price * requested, ...info };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  // 배송·설치: 사용 중인 방법 목록에 있는 id 만 인정 (없어졌거나 비활성화된 방법이면 다시 선택하도록 안내)
  const shipping = typeof shippingId === "string" ? shippingOptions.find(o => o.id === shippingId) ?? null : null;
  const shippingMessage = typeof shippingId === "string" && shippingId && !shipping ? "선택했던 배송 방법을 더 이상 사용할 수 없습니다. 다시 선택해 주세요." : undefined;
  // 공급가 합계(상품 + 배송·설치) → 부가세 10% → 최종 금액. 상품이 없으면 배송비도 계산하지 않음
  const shippingFee = shipping && itemCount > 0 ? shipping.fee : 0;
  const supplyTotal = subtotal + shippingFee, vat = vatOf(supplyTotal), total = supplyTotal + vat;
  // 주문 가능: 모든 줄이 ok + 배송 방법 선택 (조정·품절·판매중지 줄이 있으면 고객이 먼저 확인·정리해야 함)
  const orderable = lines.length > 0 && lines.every(l => l.status === "ok") && shipping !== null;
  const fingerprint = createHash("sha256").update(JSON.stringify([lines.map(l => [l.productId, l.quantity, l.unitPrice ?? null, l.status]), subtotal, shipping?.id ?? null, shippingFee, vat, total])).digest("hex");
  return { lines, itemCount, subtotal, shippingOptions, shipping, shippingMessage, shippingFee, supplyTotal, vat, total, orderable, fingerprint, checkedAt: new Date().toISOString() };
}
