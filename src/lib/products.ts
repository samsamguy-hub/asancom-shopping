import { cache } from "react";
import { demoProducts } from "@/lib/demo";
import type { Product, ProductImage } from "@/lib/types";
import { createPublicClient, dbConfigured } from "@/lib/supabase/server";
import { IMAGE_COLUMNS, signPublicImages, sortImages } from "@/lib/images";
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
