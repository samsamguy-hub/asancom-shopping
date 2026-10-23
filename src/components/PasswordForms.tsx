"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// 비밀번호 찾기: 가입한 이메일로 재설정 링크 발송. 가입 여부를 알 수 없도록 항상 같은 안내를 보여줌
export function ForgotPasswordForm({configured}:{configured:boolean}){
 const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [message,setMessage]=useState("");
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setMessage("");setBusy(true);
  const email=String(new FormData(e.currentTarget).get("email")||"").trim();
  try{const {error}=await createClient().auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/auth/callback?next=${encodeURIComponent("/account/password")}`});
   if(error&&/rate|limit|seconds/i.test(error.message))throw new Error("잠시 후 다시 시도해 주세요. (메일은 짧은 시간에 여러 번 보낼 수 없습니다)");
   setSent(true);}catch(err){setMessage(err instanceof Error?err.message:"메일을 보내지 못했습니다.");}finally{setBusy(false);}}
 if(sent)return <div className="compat good" role="status"><strong>메일을 확인해 주세요.</strong><p>가입된 이메일이면 비밀번호 재설정 링크를 보냈습니다. 링크를 눌러 새 비밀번호를 정하세요. 메일이 안 보이면 스팸함을 확인해 주세요.</p></div>;
 return <form className="auth-form" onSubmit={submit}><label>가입한 아이디 (이메일)<input name="email" type="email" required maxLength={120} autoComplete="email" placeholder="example@naver.com"/></label>
  {message&&<p className="compat bad" role="alert">{message}</p>}<button className="btn primary full" type="submit" disabled={!configured||busy}>{busy?"보내는 중...":"재설정 링크 받기"}</button></form>;
}
// 새 비밀번호 정하기: 재설정 링크로 들어온 경우(또는 로그인한 회원의 비밀번호 변경)
export function NewPasswordForm(){
 const router=useRouter();const [ready,setReady]=useState<boolean|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [done,setDone]=useState(false);
 useEffect(()=>{createClient().auth.getUser().then(({data})=>setReady(!!data.user));},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setMessage("");
  const f=new FormData(e.currentTarget);const password=String(f.get("password")||""),confirm=String(f.get("password2")||"");
  if(password.length<8||!/[a-zA-Z]/.test(password)||!/\d/.test(password))return setMessage("비밀번호는 영문과 숫자를 섞어 8자 이상으로 입력하세요.");
  if(password!==confirm)return setMessage("비밀번호 확인이 일치하지 않습니다.");
  setBusy(true);try{const {error}=await createClient().auth.updateUser({password});
   if(error)throw new Error(/same|different/i.test(error.message)?"이전과 다른 비밀번호를 입력하세요.":/reauth|recent/i.test(error.message)?"보안을 위해 다시 로그인한 뒤 변경해 주세요.":error.message);
   setDone(true);router.refresh();}catch(err){setMessage(err instanceof Error?err.message:"변경하지 못했습니다.");}finally{setBusy(false);}}
 if(ready===null)return <p className="muted">확인 중...</p>;
 if(!ready)return <div className="compat bad">재설정 링크가 만료되었거나 로그인되어 있지 않습니다. <Link className="text-link" href="/forgot-password">비밀번호 찾기</Link>를 다시 진행해 주세요.</div>;
 if(done)return <div className="compat good" role="status"><strong>비밀번호를 변경했습니다.</strong><p><Link className="text-link" href="/mypage">마이페이지로 가기</Link></p></div>;
 return <form className="auth-form" onSubmit={submit}><label>새 비밀번호 <small>영문+숫자 8자 이상</small><input name="password" type="password" required minLength={8} autoComplete="new-password"/></label><label>새 비밀번호 확인<input name="password2" type="password" required minLength={8} autoComplete="new-password"/></label>
  {message&&<p className="compat bad" role="alert">{message}</p>}<button className="btn primary full" type="submit" disabled={busy}>{busy?"변경 중...":"비밀번호 변경"}</button></form>;
}
// 회원 탈퇴: 현재 비밀번호를 다시 확인한 뒤 DB 함수(delete_my_account)로 본인 계정만 삭제
export function WithdrawForm({email}:{email:string}){
 const router=useRouter();const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setMessage("");
  const f=new FormData(e.currentTarget);const password=String(f.get("password")||"");
  if(f.get("confirm")!=="on")return setMessage("안내 내용을 확인해 주세요.");
  setBusy(true);try{const sb=createClient();
   const {error:authError}=await sb.auth.signInWithPassword({email,password});if(authError)throw new Error("비밀번호가 맞지 않습니다.");
   const {error}=await sb.rpc("delete_my_account");
   if(error)throw new Error(/admin_account/.test(error.message)?"관리자 계정은 여기서 탈퇴할 수 없습니다.":"탈퇴하지 못했습니다. 고객센터로 문의해 주세요.");
   await sb.auth.signOut();router.replace("/?withdrawn=1");router.refresh();}catch(err){setMessage(err instanceof Error?err.message:"탈퇴하지 못했습니다.");}finally{setBusy(false);}}
 if(!open)return <button type="button" className="link-button danger" onClick={()=>setOpen(true)}>회원 탈퇴</button>;
 return <form className="auth-form withdraw-form" onSubmit={submit}><strong>회원 탈퇴</strong>
  <ul className="agree-detail"><li>회원 정보(이름·휴대폰·주소)는 바로 삭제되며 되돌릴 수 없습니다.</li><li>주문 기록은 전자상거래법에 따라 5년간 보관되며, 탈퇴 후에는 비회원 주문조회(주문번호+휴대폰번호)로 확인할 수 있습니다.</li><li>진행 중인 주문이 있으면 먼저 고객센터(041-542-3342)로 문의해 주세요.</li></ul>
  <label>현재 비밀번호<input name="password" type="password" required autoComplete="current-password"/></label>
  <label className="check"><input type="checkbox" name="confirm"/> 위 내용을 확인했으며 탈퇴합니다.</label>
  {message&&<p className="compat bad" role="alert">{message}</p>}
  <div className="detail-actions"><button className="btn small danger" type="submit" disabled={busy}>{busy?"처리 중...":"탈퇴하기"}</button><button type="button" className="btn small secondary" onClick={()=>setOpen(false)}>취소</button></div></form>;
}
