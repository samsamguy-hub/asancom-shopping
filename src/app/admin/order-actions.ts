"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { DEPOSIT_DAYS, ORDER_STATUS } from "@/lib/order-rules";
// 주문 관리: 상태 변경·입금 확인·메모·취소(재고 복구). 관리자 세션 재확인 + DB RLS(is_admin)
// 주문 기록은 전자상거래법상 5년 보관 대상이라 삭제 기능 없음
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
function done(formData: FormData, failed: boolean): never {
  revalidatePath("/admin/orders"); revalidatePath("/admin"); revalidatePath("/mypage"); revalidatePath("/products"); revalidatePath("/products/[slug]", "page"); revalidatePath("/");
  const tab = str(formData.get("tab"));
  redirect(`/admin/orders?status=${tab in ORDER_STATUS || tab === "open" || tab === "all" ? tab : "open"}&${failed ? "error=1" : "saved=1"}`);
}
export async function setOrderStatus(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id")), status = str(formData.get("status"));
  if (!uuid.test(id) || !(status in ORDER_STATUS) || status === "canceled") done(formData, true);
  // 입금확인으로 바꿀 때 입금 확인 시각 기록
  const values: Record<string, unknown> = { status };
  if (status === "paid") values.paid_at = new Date().toISOString();
  const { error } = await db.from("orders").update(values).eq("id", id);
  if (error) console.error("주문 상태 변경 실패", error.message);
  done(formData, !!error);
}
export async function saveOrderMemo(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id")), memo = str(formData.get("memo"));
  if (!uuid.test(id) || memo.length > 2000) done(formData, true);
  const { error } = await db.from("orders").update({ admin_memo: memo || null }).eq("id", id);
  if (error) console.error("주문 메모 저장 실패", error.message);
  done(formData, !!error);
}
// 취소: DB 함수가 상태를 '주문취소'로 바꾸고 재고를 한 번만 복구 (되돌릴 수 없음)
export async function cancelOrder(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id"));
  if (!uuid.test(id)) done(formData, true);
  const { error } = await db.rpc("cancel_order", { p_order_id: id });
  if (error) console.error("주문 취소 실패", error.message);
  done(formData, !!error);
}
// 입금 기한이 지난 '입금대기' 주문 일괄 취소 (자동 예약과 같은 DB 함수, 재고 복구)
export async function cancelExpiredOrders(formData: FormData) {
  const db = await requireAdmin();
  const { data, error } = await db.rpc("cancel_expired_orders", { p_days: DEPOSIT_DAYS });
  if (error) { console.error("기한 지난 주문 취소 실패", error.message); done(formData, true); }
  revalidatePath("/admin/orders"); revalidatePath("/admin"); revalidatePath("/products"); revalidatePath("/products/[slug]", "page"); revalidatePath("/");
  const tab = str(formData.get("tab"));
  redirect(`/admin/orders?status=${tab in ORDER_STATUS || tab === "open" || tab === "all" ? tab : "open"}&expired=${Number(data) || 0}`);
}
