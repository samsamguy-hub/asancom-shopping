import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
type CookieItem = { name: string; value: string; options: CookieOptions };
export function dbConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
// 고객 화면 공개 데이터 조회용: 로그인 쿠키를 읽지 않음 → 페이지를 캐시(ISR)할 수 있음. 권한은 비로그인(anon)과 같음 (RLS 그대로)
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수를 설정하세요.");
  return createServerClient(url, key, { cookies: { getAll() { return []; }, setAll() {} } });
}
export async function createClient() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수를 설정하세요.");
  return createServerClient(url, key, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(items: CookieItem[]) {
        try { items.forEach(({name,value,options}) => store.set(name,value,options)); }
        catch { /* Server Component에서 쿠키를 쓸 수 없는 경우. proxy.ts가 갱신 담당 */ }
      }
    }
  });
}
