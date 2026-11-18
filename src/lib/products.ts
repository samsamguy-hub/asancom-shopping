import { cache } from "react";
import { demoProducts } from "@/lib/demo";
import { partCategories, type Product, type ProductImage } from "@/lib/types";
import { createPublicClient, dbConfigured } from "@/lib/supabase/server";
import { IMAGE_COLUMNS, signPublicImages, sortImages } from "@/lib/images";
import { compareRecommended, discountRate } from "@/lib/product-status";
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
  // 목록 카드에는 대표(첫 번째) 공개 사진 1장만 (축소본 사용)
  const signed = await signPublicImages(rows.flatMap(r => sortImages(r.product_images || []).slice(0, 1)), ["thumb"]);
  return rows.map(r => toProduct(r, signed.filter(s => s.product_id === r.id)));
}
// 상품목록(카테고리 메뉴) 한 페이지: 해당 메뉴 상품 "전체"에 정렬을 적용한 뒤 12개(PC 4열×3줄) 범위만 조회 + 정확한 전체 개수.
// 사진 서명 URL도 그 12개만 발급. 추천순·가격순은 DB에서 정렬(같은 값은 최신 등록 → id 순으로 고정해 페이지 사이 중복·누락 방지),
// 할인율은 DB에서 바로 정렬할 수 없어 가벼운 열(id·가격·정상가·등록일)만 전부 받아 서버에서 정렬한 뒤 해당 12개만 상세 조회
// (메인 추천상품 8개, 관리자 목록 10개는 각자 따로 정함)
export const PRODUCT_PAGE_SIZE = 12;
export type ProductListFilter = { category?: string; parts?: boolean; q?: string };
export type ProductListSort = "" | "priceAsc" | "priceDesc" | "discount";
export type ProductPage = { products: Product[]; total: number; outOfRange: boolean };
// 검색어: 이름·설명·카테고리에 포함 (대소문자 무시). PostgREST 조건식에 쓰이는 특수문자는 공백으로
const searchPattern = (q: string) => q.replace(/[%_*,()"\\]/g, " ").trim();
export async function getProductPage(filter: ProductListFilter, sort: ProductListSort, page: number): Promise<ProductPage> {
  const from = (page - 1) * PRODUCT_PAGE_SIZE, to = from + PRODUCT_PAGE_SIZE - 1;
  const matches = (p: Product) => (filter.category ? p.category === filter.category : !filter.parts || partCategories.includes(p.category))
    && (!filter.q || `${p.name} ${p.description} ${p.category}`.toLocaleLowerCase("ko").includes(filter.q.toLocaleLowerCase("ko")));
  const cmp: Record<ProductListSort, (a: Product, b: Product) => number> = { "": compareRecommended, priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, discount: (a, b) => exactDiscount(b) - exactDiscount(a) };
  const tie = (a: Product, b: Product) => (b.created_at || "").localeCompare(a.created_at || "") || b.id.localeCompare(a.id);
  if (!dbConfigured()) {
    const list = demoProducts.filter(p => p.active && matches(p)).sort((a, b) => cmp[sort](a, b) || tie(a, b));
    return { products: list.slice(from, to + 1), total: list.length, outOfRange: page > 1 && from >= list.length };
  }
  const db = createPublicClient(), pattern = filter.q ? searchPattern(filter.q) : "";
  const base = (columns: string, opts?: { count: "exact"; head?: boolean }) => {
    let q = db.from("products").select(columns, opts).eq("active", true);
    if (filter.category) q = q.eq("category", filter.category);
    else if (filter.parts) q = q.in("category", partCategories as string[]);
    if (filter.q) q = pattern ? q.or(`name.ilike.*${pattern}*,description.ilike.*${pattern}*,category.ilike.*${pattern}*`) : q.eq("id", "00000000-0000-0000-0000-000000000000");
    return q;
  };
  const withImages = `${PRODUCT_COLUMNS},product_images(${IMAGE_COLUMNS})`;
  const finish = async (rows: Row[], total: number): Promise<ProductPage> => {
    const signed = await signPublicImages(rows.flatMap(r => sortImages(r.product_images || []).slice(0, 1)), ["thumb"]);
    return { products: rows.map(r => toProduct(r, signed.filter(s => s.product_id === r.id))), total, outOfRange: false };
  };
  const countAll = async () => { const { count, error } = await base("id", { count: "exact", head: true }); return error ? 0 : count || 0; };
  if (sort === "discount") {
    const { data, error } = await base("id,price,list_price,created_at");
    if (error) throw new Error("상품 조회 실패: " + error.message);
    const ids = ((data || []) as unknown as Product[]).sort((a, b) => cmp.discount(a, b) || tie(a, b)).map(p => p.id);
    if (page > 1 && from >= ids.length) return { products: [], total: ids.length, outOfRange: true };
    const pageIds = ids.slice(from, to + 1);
    if (!pageIds.length) return { products: [], total: ids.length, outOfRange: false };
    const rows = await fetchRows(w => productQuery(db, w).in("id", pageIds).eq("active", true));
    const pos = new Map(pageIds.map((id, i) => [id, i]));
    return finish(rows.sort((a, b) => pos.get(a.id)! - pos.get(b.id)!), ids.length);
  }
  const ordered = (columns: string, featured: boolean) => {
    let q = base(columns, { count: "exact" });
    if (featured) q = q.order("featured_rank", { ascending: true, nullsFirst: false });
    if (sort === "priceAsc") q = q.order("price", { ascending: true });
    if (sort === "priceDesc") q = q.order("price", { ascending: false });
    q = q.order("created_at", { ascending: false }).order("id", { ascending: false });
    return (columns === withImages ? q.eq("product_images.is_public", true) : q).range(from, to);
  };
  // 추천순: 관리자 지정 추천 우선순위 → 최신 등록순. 추천 열이 아직 없으면(supabase/product_featured.sql 적용 전) 최신 등록순
  let featured = sort === "";
  let res = await ordered(withImages, featured);
  if (res.error?.code === "42703" && featured && /featured_rank/.test(res.error.message)) { featured = false; res = await ordered(withImages, false); }
  // product_images 테이블이 아직 없으면(SQL 적용 전) 사진 없이
  if (res.error?.code === "PGRST200") res = await ordered(PRODUCT_COLUMNS, featured);
  if (res.error?.code === "PGRST103") return { products: [], total: await countAll(), outOfRange: true };
  if (res.error) throw new Error("상품 조회 실패: " + res.error.message);
  return finish((res.data || []) as unknown as Row[], res.count || 0);
}
// 메인 추천상품 정렬: 판매 공개 상품 "전체"를 기준으로 순서를 계산한 뒤, 정렬마다 앞쪽 perSort개만 사진과 함께 내려줌
// (일부만 가져와서 정렬하는 문제 방지). 인기순은 supabase/product_popularity.sql 의 순위 함수(판매량 → 최근 30일 조회수)를 쓰며,
// 함수가 아직 없으면(SQL 적용 전) popularReady=false → 화면에서 '준비 중'으로 비활성
// recommended = 관리자 지정 추천순 (상품목록 추천순과 같은 기준, lib/product-status.ts compareRecommended)
export const RECOMMEND_SORTS = ["recommended", "popular", "latest", "discount", "priceAsc", "priceDesc"] as const;
export type RecommendSort = (typeof RECOMMEND_SORTS)[number];
export type Recommended = { products: Product[]; orders: Record<RecommendSort, string[]>; popularReady: boolean };
export const exactDiscount = (p: Pick<Product, "price" | "list_price">) => discountRate(p) > 0 ? (p.list_price! - p.price) / p.list_price! : 0;
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
  const orders: Record<RecommendSort, string[]> = { recommended: by(compareRecommended), popular: popularity ? by((a, b) => popRank(a) - popRank(b)) : [], latest: latest.slice(0, perSort).map(p => p.id), discount: by((a, b) => exactDiscount(b) - exactDiscount(a)), priceAsc: by((a, b) => a.price - b.price), priceDesc: by((a, b) => b.price - a.price) };
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
  const signed = await signPublicImages(rows.flatMap(r => sortImages(r.product_images || []).slice(0, 1)), ["thumb"]);
  return rows.map(r => toProduct(r, signed.filter(s => s.product_id === r.id)));
}
export const getProductBySlug = cache(async (slug: string): Promise<Product | undefined> => {
  if (!dbConfigured()) return demoProducts.find(p => p.slug === slug);
  const db = createPublicClient();
  const [row] = await fetchRows(withImages => productQuery(db, withImages).eq("slug", slug).eq("active", true).limit(1));
  if (!row) return undefined;
  return toProduct(row, await signPublicImages(sortImages(row.product_images || []), ["thumb", "large"]));
});
