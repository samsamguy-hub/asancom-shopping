// 상품사진 규칙: 브라우저 사전검사와 서버 검사가 같은 값을 사용 (supabase/product_images.sql 과 일치해야 함)
export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 10;
export const IMAGE_TYPES = {
  "image/jpeg": { exts: ["jpg", "jpeg"], ext: "jpg" },
  "image/png": { exts: ["png"], ext: "png" },
  "image/webp": { exts: ["webp"], ext: "webp" },
} as const;
export type ImageMime = keyof typeof IMAGE_TYPES;
export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const imageErrorMessages = {
  empty: "사진 파일을 선택하세요.",
  size: "사진은 5MB 이하만 올릴 수 있습니다.",
  type: "JPG, PNG, WEBP 사진만 올릴 수 있습니다.",
  mismatch: "파일 확장자·형식과 실제 파일 내용이 일치하지 않습니다.",
  count: `상품당 사진은 최대 ${MAX_IMAGES_PER_PRODUCT}장입니다.`,
  upload: "사진 저장소 업로드에 실패했습니다. Storage 버킷과 정책 설정을 확인하세요.",
  db: "사진 정보 저장에 실패했습니다. product_images 테이블과 RLS 설정을 확인하세요.",
  notfound: "사진을 찾을 수 없습니다.",
} as const;
export type ImageErrorCode = keyof typeof imageErrorMessages;
export const fileExtension = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");
// 선언된 MIME과 확장자 조합 검사 (실제 파일 내용 검사는 서버의 lib/images.ts)
export function checkDeclaredImage(file: { name: string; size: number; type: string }): ImageErrorCode | null {
  if (file.size <= 0) return "empty";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  const kind = IMAGE_TYPES[file.type as ImageMime];
  if (!kind) return "type";
  if (!(kind.exts as readonly string[]).includes(fileExtension(file.name))) return "mismatch";
  return null;
}
