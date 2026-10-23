// 사이트 주소 (검색엔진 사이트맵·공유 미리보기용). 배포 후 .env.local 에 NEXT_PUBLIC_SITE_URL=https://실제주소 를 넣으세요
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
