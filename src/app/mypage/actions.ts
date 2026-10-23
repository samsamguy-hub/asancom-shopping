"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, dbConfigured } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/estimate-rules";
// 회원 정보 수정: 로그인한 본인 행만 (DB RLS: user_id = auth.uid(), 열 권한: 이름·휴대폰·주소만)
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
export async function saveProfile(formData: FormData) {
  if (!dbConfigured()) redirect("/login");
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login?next=/mypage");
  const name = str(formData.get("name")), rawPhone = str(formData.get("phone")), phone = rawPhone ? normalizePhone(rawPhone) : "";
  const zipcode = str(formData.get("zipcode")), address1 = str(formData.get("address1")), address2 = str(formData.get("address2"));
  if (name.length < 2 || name.length > 20 || phone === null || zipcode.length > 10 || address1.length > 200 || address2.length > 200) redirect("/mypage?error=1#profile");
  const { error } = await db.from("customer_profiles").update({ name, phone, zipcode, address1, address2 }).eq("user_id", user.id);
  if (error) { console.error("회원 정보 저장 실패", error.message); redirect("/mypage?error=1#profile"); }
  revalidatePath("/mypage");
  redirect("/mypage?saved=1#profile");
}
