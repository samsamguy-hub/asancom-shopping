"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
// 배송·설치 방법 관리 (관리자 세션 재확인 + DB RLS: is_admin). 금액은 VAT 별도 공급가
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export type ShippingErrorCode = "name" | "description" | "lead_time" | "fee" | "sort" | "id" | "db";
function string(v: FormDataEntryValue | null) { return typeof v === "string" ? v.trim() : ""; }
function int(v: string, min: number, max: number) {
  const s = v.replace(/[,\s원]/g, "");
  return /^-?\d+$/.test(s) && Number(s) >= min && Number(s) <= max ? Number(s) : null;
}
function finish(code?: ShippingErrorCode): never {
  revalidatePath("/admin/shipping"); revalidatePath("/cart"); revalidatePath("/products/[slug]", "page");
  redirect(`/admin/shipping?${code ? `error=${code}` : "saved=1"}`);
}

export async function saveShippingOption(formData: FormData) {
  const db = await requireAdmin();
  const id = string(formData.get("id")), name = string(formData.get("name")), description = string(formData.get("description")), leadTime = string(formData.get("lead_time"));
  const fee = int(string(formData.get("fee")), 0, 10_000_000), sortOrder = int(string(formData.get("sort_order")) || "0", -1000, 1000);
  let code: ShippingErrorCode | undefined;
  if (id && !uuid.test(id)) code = "id";
  else if (name.length < 1 || name.length > 60) code = "name";
  else if (description.length > 200) code = "description";
  else if (leadTime.length > 60) code = "lead_time";
  else if (fee === null) code = "fee";
  else if (sortOrder === null) code = "sort";
  else {
    const payload = { name, description, lead_time: leadTime, fee, sort_order: sortOrder, active: formData.get("active") === "on" };
    const { error } = id ? await db.from("shipping_options").update(payload).eq("id", id) : await db.from("shipping_options").insert(payload);
    if (error) { console.error("배송 방법 저장 실패", error.message); code = "db"; }
  }
  finish(code);
}

export async function deleteShippingOption(formData: FormData) {
  const db = await requireAdmin();
  const id = string(formData.get("id"));
  if (!uuid.test(id)) finish("id");
  const { error } = await db.from("shipping_options").delete().eq("id", id);
  if (error) console.error("배송 방법 삭제 실패", error.message);
  finish(error ? "db" : undefined);
}
