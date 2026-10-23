import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/site";
import { INQUIRY_TYPES } from "@/lib/inquiry-rules";
// 검색엔진용 사이트맵: 주요 화면 + 판매 중인 상품 (1시간마다 갱신)
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/products", "/estimate", "/estimate/board", "/as", "/about", "/policy/terms", "/policy/privacy", "/policy/returns", ...Object.keys(INQUIRY_TYPES).map(k => `/inquiry/${k}`)];
  const products = await getProducts(false).catch(() => []);
  return [
    ...pages.map(p => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...products.map(p => ({ url: `${SITE_URL}/products/${encodeURIComponent(p.slug)}`, lastModified: p.updated_at ? new Date(p.updated_at) : undefined, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
