import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
type CookieItem = { name: string; value: string; options: CookieOptions };
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({request});
  let response = NextResponse.next({request});
  const supabase = createServerClient(url,key,{
    cookies: {
      getAll(){ return request.cookies.getAll(); },
      setAll(items: CookieItem[]) {
        items.forEach(({name,value})=> request.cookies.set(name,value));
        response = NextResponse.next({request});
        items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      }
    }
  });
  await supabase.auth.getClaims();
  return response;
}
export const config = { matcher: ["/admin/:path*", "/login", "/signup", "/mypage/:path*", "/checkout", "/order/:path*", "/auth/:path*", "/account/:path*", "/forgot-password"] };
