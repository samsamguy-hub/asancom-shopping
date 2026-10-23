"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AS_STATUS } from "@/lib/as-rules";
// A/S 접수 관리: 상태·메모·삭제. 관리자 세션 재확인 + DB RLS(is_admin)
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
function done(formData: FormData, failed: boolean): never {
  revalidatePath("/admin/as"); revalidatePath("/admin");
  const tab = str(formData.get("tab"));
  redirect(`/admin/as?status=${tab in AS_STATUS || tab === "open" || tab === "all" ? tab : "open"}&${failed ? "error=1" : "saved=1"}`);
}
async function update(formData: FormData, values: Record<string, unknown>) {
  const db = await requireAdmin(), id = str(formData.get("id"));
  if (!uuid.test(id)) done(formData, true);
  const { error } = await db.from("as_requests").update(values).eq("id", id);
  if (error) console.error("A/S 변경 실패", error.message);
  done(formData, !!error);
}
export async function setAsStatus(formData: FormData) {
  const status = str(formData.get("status"));
  if (!(status in AS_STATUS)) done(formData, true);
  await update(formData, { status });
}
export async function saveAsMemo(formData: FormData) {
  const memo = str(formData.get("memo"));
  if (memo.length > 2000) done(formData, true);
  await update(formData, { admin_memo: memo || null });
}
// 삭제: 고객 삭제 요청·보유기간 만료 시 사용 (되돌릴 수 없음)
export async function deleteAs(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id"));
  if (!uuid.test(id)) done(formData, true);
  const { error } = await db.from("as_requests").delete().eq("id", id);
  if (error) console.error("A/S 삭제 실패", error.message);
  done(formData, !!error);
}
