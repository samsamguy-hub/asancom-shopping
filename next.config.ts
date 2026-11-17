
import type { NextConfig } from "next";

// Supabase 호스트 주소 확인
const supabaseHost = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    ).hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  // 상품사진 최대 5MB 업로드 지원
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  images: {
    // Vercel 이미지 최적화 사용 안 함
    unoptimized: true,

    // 기존 Supabase 이미지 주소 설정 유지
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname:
              "/storage/v1/object/sign/product-images/**",
          },
        ]
      : [],

    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1200],
    imageSizes: [72, 120, 200, 320],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
