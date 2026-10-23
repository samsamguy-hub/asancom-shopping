"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, dbConfigured } from "@/lib/supabase/server";
import { priceCart } from "@/lib/cart-server";
import { sanitizeCartItems } from "@/lib/cart";
import { normalizePhone } from "@/lib/estimate-rules";
import { BANK_TEXT, CASH_RECEIPT, isPickup, type CashReceiptType } from "@/lib/order-rules";
import { getCustomer } from "@/lib/session";
// 주문 생성 (무통장입금). 브라우저 값은 상품 id·수량·배송 방법 id·입력 정보만 사용하고,
// 가격·배송비·부가세·재고는 DB 함수(create_order)가 다시 계산·차감. 화면에 보인 금액과 다르면 주문하지 않음
export type PlaceOrderState = { ok: true; orderNo: string; total: number; guest: boolean } | { ok: false; message: string } | null;
const recent = new Map<string, number[]>();
function tooMany(key: string) {
  const now = Date.now(), list = (recent.get(key) || []).filter(t => now - t < 10 * 60_000);
  if (list.length >= 5) { recent.set(key, list); return true; }
  recent.set(key, [...list, now]);
  if (recent.size > 5000) recent.clear();
  return false;
}
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
const fail = (message: string): PlaceOrderState => ({ ok: false, message });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function placeOrder(_prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  if (!dbConfigured()) return fail("DB 연결 후 주문할 수 있습니다.");
  let rawItems: unknown = [];
  try { rawItems = JSON.parse(str(formData.get("items")) || "[]"); } catch { return fail("주문 상품 정보가 올바르지 않습니다. 다시 시도하세요."); }
  const items = sanitizeCartItems(rawItems).filter(i => uuid.test(i.productId));
  if (!items.length) return fail("주문할 상품이 없습니다.");
  const shippingId = str(formData.get("shipping_id")), expectedTotal = Number(str(formData.get("expected_total")));
  const guest = formData.get("guest") === "1";
  const customer = await getCustomer();
  if (!guest && !customer) return fail("로그인이 필요합니다. 로그인하거나 비회원으로 주문하세요.");

  // 서버에서 가격·재고 다시 확인 (DB 함수가 최종 확인)
  const priced = await priceCart(items, shippingId);
  if (!priced.shipping) return fail("배송 방법을 선택하세요.");
  if (!priced.orderable) return fail("주문할 수 없는 상품(품절·재고 부족·판매 중지)이 있습니다. 장바구니에서 확인하세요.");
  if (!Number.isSafeInteger(expectedTotal) || priced.total !== expectedTotal) return fail("그사이 가격이나 재고가 바뀌었습니다. 바뀐 금액을 확인한 뒤 다시 주문하세요.");
  const pickup = isPickup(priced.shipping.name);

  const ordererName = str(formData.get("orderer_name")), ordererPhone = normalizePhone(str(formData.get("orderer_phone"))), ordererEmail = str(formData.get("orderer_email"));
  if (ordererName.length < 2 || ordererName.length > 20) return fail("주문자 이름을 2~20자로 입력하세요.");
  if (!ordererPhone) return fail("주문자 휴대폰번호를 정확히 입력하세요. (예: 010-1234-5678)");
  if (ordererEmail && (ordererEmail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ordererEmail))) return fail("이메일 형식을 확인하세요.");
  const info: Record<string, string> = { orderer_name: ordererName, orderer_phone: ordererPhone, orderer_email: ordererEmail, delivery_memo: str(formData.get("delivery_memo")).slice(0, 200) };
  if (!pickup) {
    const receiverName = str(formData.get("receiver_name")), receiverPhone = normalizePhone(str(formData.get("receiver_phone")));
    const zipcode = str(formData.get("zipcode")), address1 = str(formData.get("address1")), address2 = str(formData.get("address2"));
    if (receiverName.length < 2 || receiverName.length > 20) return fail("받는 분 이름을 2~20자로 입력하세요.");
    if (!receiverPhone) return fail("받는 분 연락처를 정확히 입력하세요.");
    if (zipcode.length > 10) return fail("우편번호를 확인하세요.");
    if (address1.length < 2 || address1.length > 200) return fail("배송 주소를 입력하세요.");
    if (address2.length > 200) return fail("상세 주소는 200자 이내로 입력하세요.");
    Object.assign(info, { receiver_name: receiverName, receiver_phone: receiverPhone, zipcode, address1, address2 });
  }
  const depositor = str(formData.get("depositor_name")) || ordererName;
  if (depositor.length > 20) return fail("입금자명은 20자 이내로 입력하세요.");
  const receiptType = str(formData.get("cash_receipt_type")) as CashReceiptType, receiptNumber = str(formData.get("cash_receipt_number")).replace(/\D/g, "");
  if (!(receiptType in CASH_RECEIPT)) return fail("현금영수증 종류를 선택하세요.");
  if (receiptType === "income" && !/^0\d{9,10}$/.test(receiptNumber)) return fail("현금영수증용 휴대폰번호를 확인하세요.");
  if (receiptType === "expense" && !/^\d{10}$/.test(receiptNumber)) return fail("현금영수증용 사업자등록번호 10자리를 확인하세요.");
  Object.assign(info, { depositor_name: depositor, cash_receipt_type: receiptType, cash_receipt_number: receiptType === "none" ? "" : receiptNumber });

  if (formData.get("agree_terms") !== "on" || formData.get("agree_privacy") !== "on" || formData.get("agree_order") !== "on") return fail("필수 동의 항목에 모두 동의해 주세요.");
  if (priced.lines.some(l => l.category === "완제품") && formData.get("agree_custom") !== "on") return fail("조립PC(주문 제작) 교환·반품 안내에 동의해 주세요.");

  const h = await headers();
  if (tooMany(h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local")) return fail("잠시 후 다시 주문해 주세요.");
  const db = await createClient();
  const { data, error } = await db.rpc("create_order", {
    p_items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
    p_shipping_id: priced.shipping.id, p_info: info, p_bank_account: BANK_TEXT, p_expected_total: expectedTotal,
  });
  if (error) {
    console.error("주문 생성 실패", error.code, error.message);
    const m = error.message;
    return fail(/out_of_stock/.test(m) ? "주문하는 사이 재고가 부족해졌거나 품절된 상품이 있습니다. 장바구니에서 확인하세요."
      : /price_changed/.test(m) ? "그사이 가격이 바뀌었습니다. 바뀐 금액을 확인한 뒤 다시 주문하세요."
      : /address_required/.test(m) ? "배송 정보를 모두 입력하세요."
      : error.code === "PGRST202" ? "주문 기능 준비 중입니다. 전화(041-542-3342)로 주문해 주세요."
      : "주문을 저장하지 못했습니다. 잠시 후 다시 시도하거나 전화로 주문해 주세요.");
  }
  const result = data as { order_no: string; total: number };
  revalidatePath("/"); revalidatePath("/products"); revalidatePath("/products/[slug]", "page"); revalidatePath("/admin/orders"); revalidatePath("/mypage");
  return { ok: true, orderNo: result.order_no, total: result.total, guest: !customer };
}
