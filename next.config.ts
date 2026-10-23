import type { NextConfig } from "next";
// 상품사진 이미지 최적화: 이 프로젝트 Supabase 의 상품사진(서명 URL) 주소만 허용 → 크기 줄이고 WebP·AVIF 로 변환해 캐시
const supabaseHost = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname; } catch { return ""; } })();
const nextConfig: NextConfig = {
  // 상품사진(최대 5MB) 업로드용: 서버 액션 요청 크기 기본 1MB → 6MB (multipart 여유분 포함)
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/sign/product-images/**" }] : [],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1200],
    imageSizes: [72, 120, 200, 320],
    minimumCacheTTL: 86400,
  },
};
export default nextConfig;
