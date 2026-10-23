import { createClient, dbConfigured } from "@/lib/supabase/server";
import { BOARD_PAGE_SIZE, ESTIMATE_CATEGORIES, isEstimateCategory, type EstimateCategory, type EstimatePost } from "@/lib/estimate-rules";
export * from "@/lib/estimate-rules";
// 조립PC 견적 상담 + 견적게시판 (supabase/estimates.sql)
// 부품은 관리자가 이름만 등록(가격 없음). 고객 연락처는 estimate_contacts 에만 저장되고 관리자만 조회 (RLS)
const missing = (code?: string) => code === "PGRST205" || code === "42P01" || code === "PGRST202";

// 고객 견적 화면용: 표시(active) 부품을 분류별로. available=false → SQL 미적용
export async function getEstimateParts(): Promise<{ byCategory: Record<EstimateCategory, string[]>; available: boolean }> {
  const byCategory = Object.fromEntries(ESTIMATE_CATEGORIES.map(c => [c, [] as string[]])) as Record<EstimateCategory, string[]>;
  if (!dbConfigured()) return { byCategory, available: false };
  const db = await createClient();
  const { data, error } = await db.from("estimate_parts").select("category,name").eq("active", true).order("sort_order").order("name");
  if (error) { if (missing(error.code)) return { byCategory, available: false }; throw new Error("견적 부품 조회 실패: " + error.message); }
  for (const p of data || []) if (isEstimateCategory(p.category)) byCategory[p.category].push(p.name);
  return { byCategory, available: true };
}
// 견적게시판 목록 (숨김 글 제외, 연락처 없음)
export async function getBoard(page: number): Promise<{ posts: EstimatePost[]; total: number; available: boolean }> {
  if (!dbConfigured()) return { posts: [], total: 0, available: false };
  const db = await createClient(), from = (page - 1) * BOARD_PAGE_SIZE;
  const { data, error, count } = await db.from("estimate_requests").select("id,request_no,parts,display_name,status,created_at", { count: "exact" })
    .neq("status", "hidden").order("request_no", { ascending: false }).range(from, from + BOARD_PAGE_SIZE - 1);
  if (error) { if (missing(error.code)) return { posts: [], total: 0, available: false }; throw new Error("견적게시판 조회 실패: " + error.message); }
  return { posts: (data || []) as EstimatePost[], total: count || 0, available: true };
}
export async function getBoardPost(no: number): Promise<EstimatePost | null> {
  if (!dbConfigured() || !Number.isSafeInteger(no) || no < 1) return null;
  const db = await createClient();
  const { data, error } = await db.from("estimate_requests").select("id,request_no,parts,display_name,status,created_at").eq("request_no", no).neq("status", "hidden").maybeSingle();
  if (error) { if (missing(error.code)) return null; throw new Error("견적 글 조회 실패: " + error.message); }
  return data as EstimatePost | null;
}
