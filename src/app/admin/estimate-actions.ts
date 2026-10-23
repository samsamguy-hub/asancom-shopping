"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { ESTIMATE_STATUS, isEstimateCategory } from "@/lib/estimate-rules";
import { DEFAULT_ESTIMATE_PARTS } from "@/lib/estimate-defaults";
// 견적 부품 목록·견적 문의 관리. 모든 동작에서 관리자 세션 재확인 + DB RLS(is_admin)
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
export type PartErrorCode = "category" | "name" | "empty" | "too_many" | "sort" | "duplicate" | "db";

function partsDone(category: string, result: string): never {
  revalidatePath("/admin/estimate-parts"); revalidatePath("/estimate");
  redirect(`/admin/estimate-parts?category=${encodeURIComponent(isEstimateCategory(category) ? category : "CPU")}&${result}`);
}
// 여러 개 한 번에 추가: 한 줄에 하나씩. 이미 있는 이름은 건너뜀
export async function addEstimateParts(formData: FormData) {
  const db = await requireAdmin(), category = str(formData.get("category"));
  if (!isEstimateCategory(category)) partsDone("CPU", "error=category");
  const names = [...new Set(str(formData.get("names")).split(/\r?\n/).map(s => s.trim().replace(/\s+/g, " ")).filter(Boolean))];
  if (!names.length) partsDone(category, "error=empty");
  if (names.length > 200) partsDone(category, "error=too_many");
  if (names.some(n => n.length > 120)) partsDone(category, "error=name");
  const { data: last } = await db.from("estimate_parts").select("sort_order").eq("category", category).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const base = (last?.sort_order as number | undefined) ?? 0;
  const { data, error } = await db.from("estimate_parts")
    .upsert(names.map((name, i) => ({ category, name, sort_order: Math.min(100000, base + i + 1) })), { onConflict: "category,name", ignoreDuplicates: true })
    .select("id");
  if (error) { console.error("견적 부품 추가 실패", error.message); partsDone(category, "error=db"); }
  partsDone(category, `added=${data?.length || 0}&skipped=${names.length - (data?.length || 0)}`);
}
// 기본 품목 한 번에 넣기 (CPU·메인보드·메모리·그래픽카드·SSD·파워·케이스). 이미 있는 이름은 건너뛰고, 기존 목록 뒤에 붙임
export async function addDefaultEstimateParts(formData: FormData) {
  const db = await requireAdmin(), back = str(formData.get("category"));
  let added = 0, total = 0;
  for (const [category, names] of Object.entries(DEFAULT_ESTIMATE_PARTS)) {
    if (!names?.length) continue;
    total += names.length;
    const { data: last } = await db.from("estimate_parts").select("sort_order").eq("category", category).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const base = (last?.sort_order as number | undefined) ?? 0;
    const { data, error } = await db.from("estimate_parts")
      .upsert(names.map((name, i) => ({ category, name, sort_order: Math.min(100000, base + i + 1) })), { onConflict: "category,name", ignoreDuplicates: true })
      .select("id");
    if (error) { console.error("기본 견적 부품 추가 실패", category, error.message); partsDone(back, "error=db"); }
    added += data?.length || 0;
  }
  partsDone(back, `added=${added}&skipped=${total - added}`);
}
export async function updateEstimatePart(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id")), category = str(formData.get("category"));
  const name = str(formData.get("name")).replace(/\s+/g, " "), sort = Number(str(formData.get("sort_order")) || "0");
  if (!uuid.test(id)) partsDone(category, "error=db");
  if (!name || name.length > 120) partsDone(category, "error=name");
  if (!Number.isInteger(sort) || sort < -100000 || sort > 100000) partsDone(category, "error=sort");
  const { error } = await db.from("estimate_parts").update({ name, sort_order: sort, active: formData.get("active") === "on" }).eq("id", id);
  if (error) { console.error("견적 부품 수정 실패", error.message); partsDone(category, error.code === "23505" ? "error=duplicate" : "error=db"); }
  partsDone(category, "saved=1");
}
export async function deleteEstimatePart(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id")), category = str(formData.get("category"));
  if (!uuid.test(id)) partsDone(category, "error=db");
  const { error } = await db.from("estimate_parts").delete().eq("id", id);
  if (error) { console.error("견적 부품 삭제 실패", error.message); partsDone(category, "error=db"); }
  partsDone(category, "saved=1");
}

// 견적 문의 (게시판 글 + 연락처)
function requestsDone(formData: FormData, failed: boolean): never {
  revalidatePath("/admin/estimates"); revalidatePath("/admin"); revalidatePath("/estimate/board"); revalidatePath("/estimate/board/[no]", "page");
  const tab = str(formData.get("tab"));
  redirect(`/admin/estimates?status=${tab in ESTIMATE_STATUS || tab === "all" ? tab : "all"}&${failed ? "error=1" : "saved=1"}`);
}
export async function setEstimateStatus(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id")), status = str(formData.get("status"));
  if (!uuid.test(id) || !(status in ESTIMATE_STATUS)) requestsDone(formData, true);
  const { error } = await db.from("estimate_requests").update({ status }).eq("id", id);
  if (error) console.error("견적 상태 변경 실패", error.message);
  requestsDone(formData, !!error);
}
export async function saveEstimateMemo(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id")), memo = str(formData.get("memo"));
  if (!uuid.test(id) || memo.length > 1000) requestsDone(formData, true);
  const { error } = await db.from("estimate_contacts").update({ admin_memo: memo || null }).eq("request_id", id);
  if (error) console.error("견적 메모 저장 실패", error.message);
  requestsDone(formData, !!error);
}
// 삭제: 게시글과 연락처(이름·전화번호)가 함께 삭제됨. 고객의 삭제 요청·보유기간 만료 시 사용
export async function deleteEstimate(formData: FormData) {
  const db = await requireAdmin(), id = str(formData.get("id"));
  if (!uuid.test(id)) requestsDone(formData, true);
  const { error } = await db.from("estimate_requests").delete().eq("id", id);
  if (error) console.error("견적 삭제 실패", error.message);
  requestsDone(formData, !!error);
}
