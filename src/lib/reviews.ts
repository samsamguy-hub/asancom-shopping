import { createPublicClient, dbConfigured } from "@/lib/supabase/server";
// 상품 리뷰 (supabase/product_reviews.sql). 고객 화면에는 관리자가 승인한(approved) 리뷰만
export type Review = { id: string; product_id: string; nickname: string; rating: number; content: string; status?: string; verified_purchase: boolean; admin_reply: string | null; replied_at: string | null; created_at: string };
export type ReviewSummary = { reviews: Review[]; count: number; average: number; available: boolean };
export const REVIEW_LIMITS = { nickname: [2, 20], content: [10, 1000] } as const;
const PUBLIC_COLUMNS = "id,product_id,nickname,rating,content,verified_purchase,admin_reply,replied_at,created_at";

// available=false: 리뷰 테이블이 아직 없음(SQL 미적용) 또는 DB 미연결 → 리뷰 영역을 안내 문구로 대체
export async function getApprovedReviews(productId: string, show = 20): Promise<ReviewSummary> {
  if (!dbConfigured()) return { reviews: [], count: 0, average: 0, available: false };
  const db = createPublicClient();
  // 관리자로 로그인해 고객 화면을 봐도 미승인 리뷰가 섞이지 않게 status 를 직접 거름 (보안 경계는 RLS)
  const { data, error } = await db.from("product_reviews").select(PUBLIC_COLUMNS).eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }).limit(500);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return { reviews: [], count: 0, average: 0, available: false };
    throw new Error("리뷰 조회 실패: " + error.message);
  }
  const all = (data || []) as Review[];
  const average = all.length ? Math.round(all.reduce((s, r) => s + r.rating, 0) / all.length * 10) / 10 : 0;
  return { reviews: all.slice(0, show), count: all.length, average, available: true };
}
