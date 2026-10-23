import { createClient, dbConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/lib/order-rules";
// 현재 로그인한 회원과 회원 정보 (로그인 안 했으면 null). 서버에서 세션을 다시 확인
export async function getCustomer(): Promise<{ id: string; email: string; profile: Profile | null } | null> {
  if (!dbConfigured()) return null;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  // 회원 정보 테이블이 아직 없으면(SQL 미적용) profile=null
  const { data } = await db.from("customer_profiles").select("name,phone,zipcode,address1,address2").eq("user_id", user.id).maybeSingle();
  return { id: user.id, email: user.email || "", profile: (data as Profile | null) || null };
}
