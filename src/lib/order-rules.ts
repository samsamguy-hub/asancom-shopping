// 주문·회원 공용 규칙 (브라우저·서버 공용, 서버 전용 코드 없음). 상태·선택지는 supabase/members_orders.sql 의 제약과 같아야 함
export const BANK = { bank: "국민은행", account: "458-21-0791-727", holder: "김기정" };
export const BANK_TEXT = `${BANK.bank} ${BANK.account} (예금주 ${BANK.holder})`;
export const DEPOSIT_DAYS = 3; // 입금 기한 (주문일부터). 지나면 주문이 취소될 수 있음
export const ORDER_STATUS = { pending: "입금대기", paid: "입금확인", preparing: "배송준비", shipping: "배송중", delivered: "배송완료", canceled: "주문취소" } as const;
export type OrderStatus = keyof typeof ORDER_STATUS;
export const CASH_RECEIPT = { none: "신청 안 함", income: "개인 소득공제용 (휴대폰번호)", expense: "사업자 지출증빙용 (사업자등록번호)" } as const;
export type CashReceiptType = keyof typeof CASH_RECEIPT;
// 배송 방법 이름에 '수령'이 들어가면 매장 방문 수령 → 배송지 입력 불필요 (DB 함수도 같은 기준)
export const isPickup = (shippingName: string) => shippingName.includes("수령");
export type OrderItem = { product_name: string; unit_price: number; quantity: number; line_total: number; category?: string };
export type Order = {
  id: string; order_no: string; user_id: string | null; status: OrderStatus; created_at: string;
  orderer_name: string; orderer_phone: string; orderer_email: string;
  shipping_name: string; shipping_fee: number; is_pickup: boolean;
  receiver_name: string; receiver_phone: string; zipcode: string; address1: string; address2: string; delivery_memo: string;
  goods_total: number; vat: number; total: number; bank_account: string; depositor_name: string;
  cash_receipt_type: CashReceiptType; cash_receipt_number: string; admin_memo: string | null; paid_at: string | null;
  order_items?: OrderItem[];
};
export type Profile = { name: string; phone: string; zipcode: string; address1: string; address2: string };
// 로그인 후 돌아갈 주소: 이 사이트 안의 경로만 허용 (외부 주소로 보내는 공격 방지)
export const safeNext = (v: string | null | undefined, fallback = "/") => v && /^\/(?!\/)[^\s\\]*$/.test(v) ? v : fallback;
// 입금 기한 표시 (주문 시각 + DEPOSIT_DAYS일, 한국 시간). DB 자동 취소(cancel_expired_orders)와 같은 기준
export const depositDeadline = (createdAt: string | Date) => new Date(new Date(createdAt).getTime() + DEPOSIT_DAYS * 86400_000).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
export const isDepositExpired = (createdAt: string) => Date.now() > new Date(createdAt).getTime() + DEPOSIT_DAYS * 86400_000;
