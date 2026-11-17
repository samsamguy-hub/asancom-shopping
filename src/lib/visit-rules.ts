// 방문자 통계 공통 규칙 (브라우저·서버 공용)
// 실제 운영 주소에서만 기록: localhost·Vercel 미리보기(*.vercel.app) 주소는 제외
export const TRACKED_HOSTS = ["asancom.com", "www.asancom.com"];
export const VISITOR_COOKIE = "ac_vid";
export const isTrackedHost = (host: string | null) => !!host && TRACKED_HOSTS.includes(host.split(":")[0].toLowerCase());

// 쿼리·해시는 버리고 경로만 기록. 관리자·API·인증 경로는 제외
const EXCLUDED = /^\/(admin|api|auth|_next)(\/|$)/;
export function normalizeVisitPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  let path = raw.split(/[?#]/)[0];
  if (path.length > 1) path = path.replace(/\/+$/, "") || "/";
  if (path.length > 200 || /[\s\u0000-\u001f\u007f]/.test(path) || EXCLUDED.test(path.toLowerCase())) return null;
  return path;
}

// 검색엔진·미리보기 수집기·자동화 도구 (네이버·카카오톡 앱 안의 실제 고객은 제외하지 않음)
const BOT = /bot|crawl|spider|slurp|yeti|daumoa|bingpreview|mediapartners|facebookexternalhit|kakaotalk-scrap|embedly|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptime|python|curl|wget|axios|node-fetch|undici|go-http|okhttp|java\/|libwww|httpclient|scrapy|postman/i;
export const isBot = (ua: string | null) => !ua || ua.length < 20 || BOT.test(ua);
