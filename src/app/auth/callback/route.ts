import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/order-rules";
// 가입 인증 메일 링크가 돌아오는 곳: 인증 코드를 로그인 세션으로 바꾼 뒤 원래 가려던 곳(사이트 안 경로만)으로 이동
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code"), next = safeNext(searchParams.get("next"), "/");
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
