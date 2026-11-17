import { cache } from "react";
import { demoProducts } from "@/lib/demo";
import type { Product, ProductImage } from "@/lib/types";
import { createPublicClient, dbConfigured } from "@/lib/supabase/server";
import { IMAGE_COLUMNS, signPublicImages, sortImages } from "@/lib/images";
import { discountRate } from "@/lib/product-status";
// 전체 열 조회: 새 열(sold_out, badges)을 추가하는 SQL 적용 전에도 조회가 실패하지 않도록 열 이름을 고정하지 않음
const PRODUCT_COLUMNS = "*";
type Db = ReturnType<typeof createPublicClient>;
type Row = Product & { product_images?: ProductImage[] };
type Result = PromiseLike<{ data: unknown; error: { code: string; message: string } | null }>;
// 고객 화면용 조회: 공개 사진만 포함. 관리자로 로그인해 고객 화면을 봐도 비공개 사진은 보이지 않게 직접 거름 (보안 경계는 RLS)
function productQuery(db: Db, withImages: boolean) {
  const q = db.from("products").select(withImages ? `${PRODUCT_COLUMNS},product_images(${IMAGE_COLUMNS})` : PRODUCT_COLUMNS);
  return withImages ? q.eq("product_images.is_public", true) : q;
}
async function fetchRows(run: (withImages: boolean) => Result): Promise<Row[]> {
  const first = await run(true);
  if (!first.error) return (first.data || []) as Row[];
  // product_images 테이블을 아직 만들지 않은 경우(SQL 적용 전)에도 쇼핑몰은 사진 없이 동작
  if (first.error.code !== "PGRST200") throw new Error("상품 조회 실패: " + first.error.message);
  const plain = await run(false);
  if (plain.error) throw new Error("상품 조회 실패: " + plain.error.message);
  return (plain.data || []) as Row[];
}
const toProduct = ({ product_images: _, ...p }: Row, images: ProductImage[]): Product => ({ ...p, images });
// images=false: 사진이 필요 없는 화면(견적)은 서명 URL 발급 생략. limit: 메인 추천상품처럼 일부만 필요할 때
// 고객 화면 공개 데이터라 로그인 쿠키 없이 조회 (비로그인 권한, RLS 그대로) → 페이지 캐시 가능
export async function getProducts(images = true, limit?: number): Promise<Product[]> {
  if (!dbConfigured()) return limit ? demoProducts.slice(0, limit) : demoProducts;
  const db = createPublicClient();
  const rows = await fetchRows(withImages => { const q = productQuery(db, withImages && images).eq("active", true).order("created_at", { ascending: false }); return limit ? q.limit(limit) : q; });
  if (!images) return rows.map(r => toProduct(r, []));
  // 목록 카드에는 대표(첫 번째) 공개 사진 1장만
  const signed = await signPublicImages(rows.flatMap(r => sortImages(r.product_images || []).slice(0, 1)));
  return rows.map(r => toProduct(r, signed.filter(s => s.product_id === r.id)));
}
// 메인 추천상품 정렬: 판매 공개 상품 "전체"를 기준으로 순서를 계산한 뒤, 정렬마다 앞쪽 perSort개만 사진과 함께 내려줌
// (일부만 가져와서 정렬하는 문제 방지). 인기순은 supabase/product_popularity.sql 의 순위 함수(판매량 → 최근 30일 조회수)를 쓰며,
// 함수가 아직 없으면(SQL 적용 전) popularReady=false → 화면에서 '준비 중'으로 비활성
export const RECOMMEND_SORTS = ["popular", "latest", "discount", "priceAsc", "priceDesc"] as const;
export type RecommendSort = (typeof RECOMMEND_SORTS)[number];
export type Recommended = { products: Product[]; orders: Record<RecommendSort, string[]>; popularReady: boolean };
const exactDiscount = (p: Pick<Product, "price" | "list_price">) => discountRate(p) > 0 ? (p.list_price! - p.price) / p.list_price! : 0;
// 인기 순위 (상품 id → 순위). 함수 없음·오류 시 null (고객 화면은 계속 동작)
async function getPopularityRank(): Promise<Map<string, number> | null> {
  const { data, error } = await createPublicClient().rpc("product_popularity_rank");
  if (error) { if (error.code !== "PGRST202") console.error("인기 순위 조회 실패", error.code, error.message); return null; }
  return new Map(((data || []) as { product_id: string; rank: number }[]).map(r => [r.product_id, r.rank]));
}
export async function getRecommendedProducts(perSort = 24): Promise<Recommended> {
  let all: Product[], popularity: Map<string, number> | null = null;
  if (!dbConfigured()) all = demoProducts.filter(p => p.active);
  else {
    const [{ data, error }, pop] = await Promise.all([createPublicClient().from("products").select(PRODUCT_COLUMNS).eq("active", true).order("created_at", { ascending: false }), getPopularityRank()]);
    if (error) throw new Error("상품 조회 실패: " + error.message);
    all = (data || []) as Product[];
    popularity = pop;
  }
  // 등록순(최신 먼저)이 기본. 같은 값끼리는 최신 등록 상품이 앞
  const latest = [...all].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  const rank = new Map(latest.map((p, i) => [p.id, i]));
  const by = (cmp: (a: Product, b: Product) => number) => [...latest].sort((a, b) => cmp(a, b) || rank.get(a.id)! - rank.get(b.id)!).slice(0, perSort).map(p => p.id);
  // 할인율순: 정상가가 판매가보다 높은 상품만 실제 할인율로 정렬, 할인 없는 상품은 그 뒤에 최신순
  // 인기제품순: 순위가 있는 상품(판매·조회 실적 있음)을 순위대로, 나머지는 그 뒤에 최신순
  const popRank = (p: Product) => popularity?.get(p.id) ?? Number.MAX_SAFE_INTEGER;
  const orders: Record<RecommendSort, string[]> = { popular: popularity ? by((a, b) => popRank(a) - popRank(b)) : [], latest: latest.slice(0, perSort).map(p => p.id), discount: by((a, b) => exactDiscount(b) - exactDiscount(a)), priceAsc: by((a, b) => a.price - b.price), priceDesc: by((a, b) => b.price - a.price) };
  const ids = [...new Set(Object.values(orders).flat())];
  const products = dbConfigured() ? await getProductsByIds(ids) : all.filter(p => ids.includes(p.id));
  const found = new Set(products.map(p => p.id));
  for (const k of RECOMMEND_SORTS) orders[k] = orders[k].filter(id => found.has(id));
  // 카드에 쓰지 않는 긴 설명은 브라우저로 보내지 않음
  return { products: products.map(p => ({ ...p, description: "" })), orders, popularReady: !!popularity };
}
// 장바구니·주문 검증용: 판매 공개 상품만(RLS + active 조건). 비공개·삭제 상품은 결과에서 빠짐. 대표 사진 1장 포함
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!dbConfigured()) return demoProducts.filter(p => ids.includes(p.id));
  const uuids = ids.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id));
  if (!uuids.length) return [];
  const db = createPublicClient();
  const rows = await fetchRows(withImages => productQuery(db, withImages).in("id", uuids).eq("active", true));
  const signed = await signPublicImages(rows.flatMap(r => sortImages(r.product_images || []).slice(0, 1)));
  return rows.map(r => toProduct(r, signed.filter(s => s.product_id === r.id)));
}
export const getProductBySlug = cache(async (slug: string): Promise<Product | undefined> => {
  if (!dbConfigured()) return demoProducts.find(p => p.slug === slug);
  const db = createPublicClient();
  const [row] = await fetchRows(withImages => productQuery(db, withImages).eq("slug", slug).eq("active", true).limit(1));
  if (!row) return undefined;
  return toProduct(row, await signPublicImages(sortImages(row.product_images || [])));
});
