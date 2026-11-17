// 사이트 주소 (검색엔진 사이트맵·공유 미리보기용). 배포 후 .env.local 에 NEXT_PUBLIC_SITE_URL=https://실제주소 를 넣으세요
// "www.asancom.com"처럼 https:// 없이 입력해도 사이트맵 주소가 올바른 형식이 되도록 자동으로 붙임
const raw = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
export const SITE_URL = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
