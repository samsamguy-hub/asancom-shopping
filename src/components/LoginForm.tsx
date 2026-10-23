"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// 회원·관리자 공용 로그인. 돌아갈 주소(next)가 있으면 그곳으로, 없으면 관리자는 /admin, 회원은 홈으로
// 관리자 권한은 여기서 판단하지 않음 (관리자 화면·서버 동작마다 서버가 다시 확인)
export default function LoginForm({configured,next,admin}:{configured:boolean,next:string|null,admin:boolean}) {
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const router=useRouter();
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage("");try{
 const supabase=createClient();const {data,error}=await supabase.auth.signInWithPassword({email,password});
 if(error)throw new Error(/invalid login/i.test(error.message)?"아이디(이메일) 또는 비밀번호가 맞지 않습니다.":/not confirmed/i.test(error.message)?"이메일 인증이 아직 안 되었습니다. 가입 시 받은 메일의 인증 링크를 눌러 주세요.":error.message);
 let to=next;
 if(!to){const {data:role}=await supabase.from("admins").select("user_id").eq("user_id",data.user.id).maybeSingle();to=role?"/admin":"/";}
 router.replace(to);router.refresh();
 }catch(err){setMessage(err instanceof Error?err.message:"로그인 실패");}finally{setBusy(false);}}
 return <form className="auth-form" onSubmit={submit}><label>{admin?"관리자 이메일":"아이디 (이메일)"}<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@naver.com"/></label><label>비밀번호<input type="password" minLength={6} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button type="submit" className="btn primary full" disabled={!configured||busy}>{busy?"로그인 중...":admin?"관리자 로그인":"로그인"}</button>{!configured&&<p className="compat bad">Supabase 연결 후 로그인할 수 있습니다. .env.local을 설정하세요.</p>}{message&&<p className="compat bad" role="alert">{message}</p>}</form>;
}
