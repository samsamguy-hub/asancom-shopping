import { redirect } from "next/navigation";
import { createClient, dbConfigured } from "@/lib/supabase/server";
export async function requireAdmin() {
  if (!dbConfigured()) redirect("/login?error=setup");
  const db = await createClient();
  const {data:{user},error} = await db.auth.getUser();
  if (error || !user) redirect("/login?next=/admin");
  const {data: admin,error:roleError} = await db.from("admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if (roleError || !admin) redirect("/login?error=permission");
  return db;
}
