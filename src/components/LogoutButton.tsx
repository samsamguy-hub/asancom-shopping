"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function LogoutButton(){const router=useRouter();return <button className="btn secondary" onClick={async()=>{await createClient().auth.signOut();router.replace("/");router.refresh();}}>로그아웃</button>}
