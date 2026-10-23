"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
// 리뷰 관리: 승인·숨김·삭제·구매확인·판매자 답글만 (본문 수정·대리 작성 기능 없음). 관리자 세션 재확인 + DB RLS(is_admin)
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
const tabs = ["pending", "approved", "hidden"];
function done(formData: FormData, failed: boolean): never {
  revalidatePath("/admin/reviews"); revalidatePath("/admin"); revalidatePath("/products/[slug]", "page");
  const tab = str(formData.get("tab"));
  redirect(`/admin/reviews?status=${tabs.includes(tab) ? tab : "pending"}&${failed ? "error=1" : "saved=1"}`);
}
async function update(formData: FormData, values: Record<string, unknown>) {
  const db = await requireAdmin(), id = str(formData.get("id"));
  if (!uuid.test(id)) done(formData, true);
  const { error } = await db.from("product_reviews").update(values).eq("id", id);
  if (error) console.error("리뷰 변경 실패", error.message);
  done(formData, !!error);
}
export async function setReviewStatus(formData: FormData) {
  const status = str(formData.get("status"));
  if (!["approved", "hidden"].includes(status)) done(formData, true);
  await update(formData, { status });
}
export async function toggleVerifiedPurchase(formData: FormData) {
  await update(formData, { verified_purchase: str(formData.get("verified")) !== "true" });
}
// 판매자 답글: 비우고 저장하면 답글 삭제
export async function saveReviewReply(formData: FormData) {
  const reply = str(formData.get("reply"));
  if (reply.length > 1000) done(formData, true);
  await update(formData, { admin_reply: reply || null, replied_at: reply ? new Date().toISOString() : null });
}
export async function deleteReview(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id"));
  if (!uuid.test(id)) done(formData, true);
  const { error } = await db.from("product_reviews").delete().eq("id", id);
  if (error) console.error("리뷰 삭제 실패", error.message);
  done(formData, !!error);
}
