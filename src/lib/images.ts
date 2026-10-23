import { createClient } from "@/lib/supabase/server";
import { checkDeclaredImage, IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGES_PER_PRODUCT, type ImageErrorCode, type ImageMime } from "@/lib/image-rules";
import type { ProductImage } from "@/lib/types";
type Db = Awaited<ReturnType<typeof createClient>>;
export type ValidImage = { bytes: Uint8Array; mime: ImageMime; size: number };
export class ImageError extends Error { constructor(public code: ImageErrorCode) { super(code); } }
export const IMAGE_COLUMNS = "id,product_id,storage_path,is_public,sort_order,alt_text,created_at";

// 파일 앞부분(매직 바이트)으로 실제 형식 판별: 확장자·Content-Type 위조 방지
function sniff(b: Uint8Array): ImageMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

// 파일 미선택이면 null, 규칙 위반이면 ImageError
export async function validateImage(value: FormDataEntryValue | null): Promise<ValidImage | null> {
  if (!(value instanceof File) || (value.size === 0 && !value.name)) return null;
  const declared = checkDeclaredImage(value);
  if (declared) throw new ImageError(declared);
  const bytes = new Uint8Array(await value.arrayBuffer());
  if (bytes.length !== value.size) throw new ImageError("upload");
  if (sniff(bytes) !== value.type) throw new ImageError("mismatch");
  return { bytes, mime: value.type as ImageMime, size: bytes.length };
}

// 새 파일을 무작위 이름으로 업로드 (덮어쓰기 금지)
export async function storeImage(db: Db, productId: string, file: ValidImage) {
  const path = `products/${productId}/${crypto.randomUUID()}.${IMAGE_TYPES[file.mime].ext}`;
  const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, file.bytes, { contentType: file.mime, upsert: false, cacheControl: "31536000" });
  if (error) { console.error("상품사진 업로드 실패", error.message); throw new ImageError("upload"); }
  return path;
}

export async function removeStoredImage(db: Db, path: string) {
  const { error } = await db.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) console.error("상품사진 파일 삭제 실패 (파일만 남고 고객에게는 보이지 않음)", path, error.message);
}

// 업로드 + product_images 행 추가. 행 추가 실패 시 올린 파일을 지움
export async function addImage(db: Db, productId: string, file: ValidImage, isPublic: boolean, altText: string | null) {
  const { data: rows, error } = await db.from("product_images").select("sort_order").eq("product_id", productId);
  if (error) { console.error("상품사진 조회 실패", error.message); throw new ImageError("db"); }
  if (rows.length >= MAX_IMAGES_PER_PRODUCT) throw new ImageError("count");
  const path = await storeImage(db, productId, file);
  const sortOrder = rows.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;
  const { error: insertError } = await db.from("product_images").insert({ product_id: productId, storage_path: path, mime_type: file.mime, size_bytes: file.size, is_public: isPublic, sort_order: sortOrder, alt_text: altText });
  if (insertError) { console.error("상품사진 정보 저장 실패", insertError.message); await removeStoredImage(db, path); throw new ImageError("db"); }
}

export const sortImages = (images: ProductImage[]) => [...images].sort((a, b) => a.sort_order - b.sort_order || (a.created_at || "").localeCompare(b.created_at || ""));

// 고객 화면용 공개 사진 서명 URL: 3시간짜리를 발급해 70분 이상 남아 있으면 같은 주소를 다시 사용
// (매번 새 주소를 만들면 브라우저가 같은 사진을 계속 새로 받음). 비로그인 권한으로 발급 → 공개 사진만 발급됨 (Storage RLS)
const PUBLIC_SIGN_SECONDS = 3 * 3600, REUSE_MIN_LEFT_MS = 70 * 60_000;
const signedCache = new Map<string, { url: string; exp: number }>();
export async function signPublicImages(images: ProductImage[]): Promise<ProductImage[]> {
  if (!images.length) return images;
  const now = Date.now(), urls = new Map<string, string>();
  for (const i of images) { const c = signedCache.get(i.storage_path); if (c && c.exp - now > REUSE_MIN_LEFT_MS) urls.set(i.storage_path, c.url); }
  const missing = [...new Set(images.map(i => i.storage_path).filter(p => !urls.has(p)))];
  if (missing.length) {
    const { createPublicClient } = await import("@/lib/supabase/server");
    const { data, error } = await createPublicClient().storage.from(IMAGE_BUCKET).createSignedUrls(missing, PUBLIC_SIGN_SECONDS);
    if (error || !data) console.error("상품사진 서명 URL 발급 실패", error?.message);
    if (signedCache.size > 3000) signedCache.clear();
    for (const d of data || []) if (d.path && d.signedUrl && !d.error) { urls.set(d.path, d.signedUrl); signedCache.set(d.path, { url: d.signedUrl, exp: now + PUBLIC_SIGN_SECONDS * 1000 }); }
  }
  return images.map(i => ({ ...i, url: urls.get(i.storage_path) }));
}
// 관리자 화면용 1시간짜리 서명 URL (비공개 사진 포함, 재사용 안 함). 권한이 없는 사진은 Storage RLS가 거부하여 url 없이 반환
export async function signImages(db: Db, images: ProductImage[]): Promise<ProductImage[]> {
  if (!images.length) return images;
  const { data, error } = await db.storage.from(IMAGE_BUCKET).createSignedUrls(images.map(i => i.storage_path), 3600);
  if (error || !data) { console.error("상품사진 서명 URL 발급 실패", error?.message); return images; }
  const urls = new Map<string, string>();
  for (const d of data) if (d.path && d.signedUrl && !d.error) urls.set(d.path, d.signedUrl);
  return images.map(i => ({ ...i, url: urls.get(i.storage_path) }));
}
