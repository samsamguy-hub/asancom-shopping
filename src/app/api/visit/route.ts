import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { createClient, dbConfigured } from "@/lib/supabase/server";
import { isBot, isTrackedHost, normalizeVisitPath, VISITOR_COOKIE } from "@/lib/visit-rules";
// 방문자 통계 기록. 고객 화면에 영향이 없도록 결과와 관계없이 항상 204 응답
// 제외: Vercel 운영(Production) 배포가 아님, 운영 주소가 아님(localhost·미리보기), 다른 사이트에서 보낸 요청, 봇, 관리자 경로
// 관리자 계정 로그인 여부는 DB 함수(record_site_visit)가 실제 세션으로 다시 확인
// 원본 IP는 저장하지 않음. 아래 메모리 제한에만 잠깐 사용
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// 같은 접속지에서 10분에 100건까지 (서버 1대 기준 보조 수단)
const hits = new Map<string, number[]>();
function tooMany(key: string) {
  const now = Date.now(), list = (hits.get(key) || []).filter(t => now - t < 10 * 60_000);
  if (list.length >= 100) { hits.set(key, list); return true; }
  hits.set(key, [...list, now]);
  if (hits.size > 5000) hits.clear();
  return false;
}
// 같은 방문자·같은 페이지 중복 요청은 10초에 1번만
const seen = new Map<string, number>();
function duplicate(key: string) {
  const now = Date.now(), last = seen.get(key);
  if (last && now - last < 10_000) return true;
  seen.set(key, now);
  if (seen.size > 5000) seen.clear();
  return false;
}

export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  if (process.env.VERCEL_ENV !== "production" || !dbConfigured()) return done;
  const h = request.headers, host = h.get("host");
  if (!isTrackedHost(host)) return done;
  const site = h.get("sec-fetch-site");
  if (site && site !== "same-origin") return done;
  const origin = h.get("origin");
  if (origin) { try { if (new URL(origin).host !== host) return done; } catch { return done; } }
  if (isBot(h.get("user-agent"))) return done;

  const text = await request.text();
  if (text.length > 600) return done;
  let path: string | null = null;
  try { path = normalizeVisitPath(JSON.parse(text)?.path); } catch { /* 잘못된 본문 무시 */ }
  if (!path) return done;
  if (tooMany(h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local")) return done;

  // 익명 방문자 ID: 무작위 값을 쿠키에 1년 보관. DB에는 SHA-256 값만 저장
  const store = await cookies();
  let id = store.get(VISITOR_COOKIE)?.value || "";
  if (!uuid.test(id)) {
    id = randomUUID();
    store.set(VISITOR_COOKIE, id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 365 * 24 * 3600 });
  }
  const visitor = createHash("sha256").update(id).digest("hex");
  if (duplicate(visitor + path)) return done;

  const db = await createClient();
  const { error } = await db.rpc("record_site_visit", { p_visitor: visitor, p_path: path });
  // PGRST202: supabase/visitor_stats.sql 적용 전 (함수 없음)
  if (error && error.code !== "PGRST202") console.error("방문 기록 실패", error.code, error.message);
  return done;
}
