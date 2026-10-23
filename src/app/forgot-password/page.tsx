import Link from "next/link";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/PasswordForms";
import { dbConfigured } from "@/lib/supabase/server";
export const metadata:Metadata={title:"비밀번호 찾기 | 아산컴마트"};
export default function ForgotPasswordPage(){
 return <div className="wide section login-wrap"><span className="eyebrow blue">PASSWORD</span><h1>비밀번호 찾기</h1><p>가입한 이메일로 비밀번호 재설정 링크를 보내 드립니다.</p>
  <ForgotPasswordForm configured={dbConfigured()}/><p className="login-links"><Link className="text-link" href="/login">로그인</Link><span aria-hidden="true">·</span><Link className="text-link" href="/signup">회원가입</Link></p></div>;
}
