import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
// 검색엔진 수집 규칙: 관리자·주문·회원 화면은 수집하지 않음
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/checkout", "/mypage", "/order", "/account", "/auth", "/login", "/signup", "/forgot-password", "/cart"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
