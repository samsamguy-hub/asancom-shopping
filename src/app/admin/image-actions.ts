"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { addImage, ImageError, removeStoredImage, storeImage, validateImage } from "@/lib/images";
import type { ImageErrorCode } from "@/lib/image-rules";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function string(v: FormDataEntryValue | null) { return typeof v === "string" ? v.trim() : ""; }
function ids(formData: FormData, withImage: boolean) {
  const productId = string(formData.get("product_id")), imageId = string(formData.get("image_id"));
  if (!uuid.test(productId) || (withImage && !uuid.test(imageId))) throw new Error("상품 또는 사진 ID 오류");
  return { productId, imageId };
}
function errorCode(e: unknown): ImageErrorCode {
  if (e instanceof ImageError) return e.code;
  console.error("상품사진 처리 오류", e);
  return "upload";
}
// 처리 후 같은 수정 화면으로 돌아가 결과 표시 (redirect는 try 밖에서 호출해야 함)
function finish(productId: string, code?: ImageErrorCode): never {
  revalidatePath("/"); revalidatePath("/products"); revalidatePath("/products/[slug]", "page"); revalidatePath("/admin");
  redirect(`/admin/products/${productId}?${code ? `image_error=${code}` : "image_saved=1"}`);
}
async function findImage(db: Awaited<ReturnType<typeof requireAdmin>>, productId: string, imageId: string) {
  const { data, error } = await db.from("product_images").select("id,storage_path,sort_order").eq("id", imageId).eq("product_id", productId).maybeSingle();
  if (error) { console.error("상품사진 조회 실패", error.message); throw new ImageError("db"); }
  if (!data) throw new ImageError("notfound");
  return data as { id: string; storage_path: string; sort_order: number };
}

export async function uploadProductImage(formData: FormData) {
  const db = await requireAdmin(); const { productId } = ids(formData, false);
  let code: ImageErrorCode | undefined;
  try {
    const file = await validateImage(formData.get("photo"));
    if (!file) throw new ImageError("empty");
    await addImage(db, productId, file, formData.get("is_public") === "on", string(formData.get("alt_text")).slice(0, 120) || null);
  } catch (e) { code = errorCode(e); }
  finish(productId, code);
}

// 교체: 새 파일 업로드 → 행의 경로 변경 → 이전 파일 삭제. 중간 실패 시 새 파일을 지워 원상태 유지
export async function replaceProductImage(formData: FormData) {
  const db = await requireAdmin(); const { productId, imageId } = ids(formData, true);
  let code: ImageErrorCode | undefined;
  try {
    const file = await validateImage(formData.get("photo"));
    if (!file) throw new ImageError("empty");
    const old = await findImage(db, productId, imageId);
    const path = await storeImage(db, productId, file);
    const { error } = await db.from("product_images").update({ storage_path: path, mime_type: file.mime, size_bytes: file.size }).eq("id", old.id);
    if (error) { console.error("상품사진 교체 실패", error.message); await removeStoredImage(db, path); throw new ImageError("db"); }
    await removeStoredImage(db, old.storage_path);
  } catch (e) { code = errorCode(e); }
  finish(productId, code);
}

// 삭제: 행을 먼저 지움 → 파일 삭제가 실패해도 고객에게는 보이지 않음
export async function deleteProductImage(formData: FormData) {
  const db = await requireAdmin(); const { productId, imageId } = ids(formData, true);
  let code: ImageErrorCode | undefined;
  try {
    const old = await findImage(db, productId, imageId);
    const { error } = await db.from("product_images").delete().eq("id", old.id);
    if (error) { console.error("상품사진 삭제 실패", error.message); throw new ImageError("db"); }
    await removeStoredImage(db, old.storage_path);
  } catch (e) { code = errorCode(e); }
  finish(productId, code);
}

export async function toggleProductImage(formData: FormData) {
  const db = await requireAdmin(); const { productId, imageId } = ids(formData, true);
  let code: ImageErrorCode | undefined;
  try {
    const { error } = await db.from("product_images").update({ is_public: string(formData.get("is_public")) !== "true" }).eq("id", imageId).eq("product_id", productId);
    if (error) { console.error("상품사진 공개 변경 실패", error.message); throw new ImageError("db"); }
  } catch (e) { code = errorCode(e); }
  finish(productId, code);
}

// 대표 사진: 순서를 가장 앞으로 (목록 카드와 상세페이지 첫 사진)
export async function setMainProductImage(formData: FormData) {
  const db = await requireAdmin(); const { productId, imageId } = ids(formData, true);
  let code: ImageErrorCode | undefined;
  try {
    await findImage(db, productId, imageId);
    const { data, error } = await db.from("product_images").select("sort_order").eq("product_id", productId).order("sort_order", { ascending: true }).limit(1);
    if (error) throw new ImageError("db");
    const { error: updateError } = await db.from("product_images").update({ sort_order: (data?.[0]?.sort_order ?? 0) - 1 }).eq("id", imageId);
    if (updateError) { console.error("대표 사진 지정 실패", updateError.message); throw new ImageError("db"); }
  } catch (e) { code = errorCode(e); }
  finish(productId, code);
}
