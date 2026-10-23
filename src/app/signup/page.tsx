import Link from "next/link";
import type { Metadata } from "next";
import SignupForm from "@/components/SignupForm";
import { dbConfigured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/order-rules";
export const metadata:Metadata={title:"회원가입 | 아산컴마트"};
export default async function SignupPage({searchParams}:{searchParams:Promise<{next?:string}>}){
 const {next}=await searchParams;
 return <div className="wide section login-wrap"><span className="eyebrow blue">JOIN</span><h1>회원가입</h1><p>필요한 정보만 받습니다. 회원이 아니어도 비회원으로 주문할 수 있습니다.</p>
  <SignupForm configured={dbConfigured()} next={safeNext(next,"/")}/>
  <p className="login-links">이미 회원이신가요? <Link className="text-link" href={`/login${next?`?next=${encodeURIComponent(safeNext(next,"/"))}`:""}`}>로그인</Link></p></div>;
}
