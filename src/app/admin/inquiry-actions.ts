"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { INQUIRY_STATUS, isInquiryType } from "@/lib/inquiry-rules";
// 홈페이지·앱·창업 문의 관리: 상태·메모·삭제. 관리자 세션 재확인 + DB RLS(is_admin)
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
function done(formData: FormData, failed: boolean): never {
  revalidatePath("/admin/inquiries"); revalidatePath("/admin");
  const tab = str(formData.get("tab")), kind = str(formData.get("kind_tab"));
  const q = new URLSearchParams({ status: tab in INQUIRY_STATUS || tab === "open" || tab === "all" ? tab : "open", type: isInquiryType(kind) ? kind : "all" });
  q.set(failed ? "error" : "saved", "1");
  redirect(`/admin/inquiries?${q}`);
}
async function update(formData: FormData, values: Record<string, unknown>) {
  const db = await requireAdmin(), id = str(formData.get("id"));
  if (!uuid.test(id)) done(formData, true);
  const { error } = await db.from("business_inquiries").update(values).eq("id", id);
  if (error) console.error("문의 변경 실패", error.message);
  done(formData, !!error);
}
export async function setInquiryStatus(formData: FormData) {
  const status = str(formData.get("status"));
  if (!(status in INQUIRY_STATUS)) done(formData, true);
  await update(formData, { status });
}
export async function saveInquiryMemo(formData: FormData) {
  const memo = str(formData.get("memo"));
  if (memo.length > 2000) done(formData, true);
  await update(formData, { admin_memo: memo || null });
}
// 삭제: 고객 삭제 요청·보유기간 만료 시 사용 (되돌릴 수 없음)
export async function deleteInquiry(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id"));
  if (!uuid.test(id)) done(formData, true);
  const { error } = await db.from("business_inquiries").delete().eq("id", id);
  if (error) console.error("문의 삭제 실패", error.message);
  done(formData, !!error);
}
