"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, dbConfigured } from "@/lib/supabase/server";
import { REVIEW_LIMITS } from "@/lib/reviews";
// 고객 리뷰 작성: 누구나 가능하지만 항상 '검토 대기'로 저장되고 관리자 승인 후 게시 (DB 열 권한·RLS 로 강제)
// 개인정보(이메일·전화·IP)는 저장하지 않음. IP 는 아래 메모리 제한에만 잠깐 사용
export type ReviewFormState = { ok: boolean; message: string } | null;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// 간단한 연속 작성 제한: 같은 접속지에서 10분에 3건 (서버 1대 기준. 여러 서버·서버리스에서는 보조 수단일 뿐, 최종 방어는 관리자 승인)
const recent = new Map<string, number[]>();
function tooMany(key: string) {
  const now = Date.now(), list = (recent.get(key) || []).filter(t => now - t < 10 * 60_000);
  if (list.length >= 3) { recent.set(key, list); return true; }
  recent.set(key, [...list, now]);
  if (recent.size > 5000) recent.clear();
  return false;
}
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";

export async function submitReview(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const productId = str(formData.get("product_id")), nickname = str(formData.get("nickname")), content = str(formData.get("content"));
  const rating = Number(str(formData.get("rating")));
  // 자동 등록 프로그램용 숨김 칸: 사람이 보지 못하는 칸이 채워져 있으면 저장하지 않고 성공처럼 응답
  if (str(formData.get("website"))) return { ok: true, message: "리뷰가 접수되었습니다. 관리자 확인 후 게시됩니다." };
  if (!dbConfigured()) return { ok: false, message: "DB 연결 후 리뷰를 작성할 수 있습니다." };
  if (!uuid.test(productId)) return { ok: false, message: "상품 정보가 올바르지 않습니다." };
  if (nickname.length < REVIEW_LIMITS.nickname[0] || nickname.length > REVIEW_LIMITS.nickname[1]) return { ok: false, message: "닉네임은 2~20자로 입력하세요." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: "별점을 선택하세요." };
  if (content.length < REVIEW_LIMITS.content[0] || content.length > REVIEW_LIMITS.content[1]) return { ok: false, message: "리뷰 내용은 10~1000자로 입력하세요." };
  if ((content.match(/https?:\/\/|www\./gi) || []).length > 1) return { ok: false, message: "링크는 1개까지만 넣을 수 있습니다." };
  if (formData.get("agree") !== "on") return { ok: false, message: "리뷰 게시 안내에 동의해 주세요." };
  const h = await headers();
  if (tooMany(h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local")) return { ok: false, message: "잠시 후 다시 작성해 주세요. (10분에 3건까지)" };
  const db = await createClient();
  // 상태·구매확인·답글은 보내지 않음 (DB 가 검토 대기로 저장)
  const { error } = await db.from("product_reviews").insert({ product_id: productId, nickname, rating, content });
  if (error) {
    console.error("리뷰 저장 실패", error.code, error.message);
    return { ok: false, message: error.code === "PGRST205" ? "리뷰 기능 준비 중입니다." : "리뷰를 저장하지 못했습니다. 판매 중인 상품인지 확인 후 다시 시도하세요." };
  }
  revalidatePath("/admin/reviews");
  return { ok: true, message: "리뷰가 접수되었습니다. 관리자 확인 후 게시됩니다. 감사합니다!" };
}
