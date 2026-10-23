"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/estimate-rules";
// 회원가입: 아이디(이메일)·비밀번호·이름·휴대폰 + 필수 동의. 회원 정보 행은 DB 트리거가 만듦 (supabase/members_orders.sql)
export default function SignupForm({configured,next}:{configured:boolean,next:string}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [sent,setSent]=useState("");
 const [agree,setAgree]=useState({terms:false,privacy:false,age:false});const all=agree.terms&&agree.privacy&&agree.age;
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setMessage("");
  const f=new FormData(e.currentTarget);const email=String(f.get("email")||"").trim(),password=String(f.get("password")||""),confirm=String(f.get("password2")||"");
  const name=String(f.get("name")||"").trim(),phone=normalizePhone(String(f.get("phone")||""));
  if(password.length<8||!/[a-zA-Z]/.test(password)||!/\d/.test(password))return setMessage("비밀번호는 영문과 숫자를 섞어 8자 이상으로 입력하세요.");
  if(password!==confirm)return setMessage("비밀번호 확인이 일치하지 않습니다.");
  if(name.length<2||name.length>20)return setMessage("이름을 2~20자로 입력하세요.");
  if(!phone)return setMessage("휴대폰번호를 정확히 입력하세요. (예: 010-1234-5678)");
  if(!all)return setMessage("필수 항목에 모두 동의해 주세요.");
  setBusy(true);try{
   const {data,error}=await createClient().auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,data:{name,phone,agree_terms:true,agree_privacy:true}}});
   if(error)throw new Error(/already registered|already exists/i.test(error.message)?"이미 가입된 이메일입니다. 로그인해 주세요.":/password/i.test(error.message)?"비밀번호가 너무 쉽습니다. 다른 비밀번호를 입력하세요.":error.message);
   // 이메일 인증을 쓰는 설정이면 세션이 없음 → 인증 메일 안내
   if(data.session){router.replace(next);router.refresh();}else setSent(email);
  }catch(err){setMessage(err instanceof Error?err.message:"가입하지 못했습니다.");}finally{setBusy(false);}}
 if(sent)return <div className="compat good" role="status"><strong>가입 신청이 완료되었습니다.</strong><p>{sent} 으로 보낸 인증 메일의 링크를 누르면 가입이 끝납니다. 메일이 안 보이면 스팸함을 확인해 주세요.</p></div>;
 return <form className="auth-form" onSubmit={submit}>
  <label>아이디 (이메일) *<input name="email" type="email" required maxLength={120} autoComplete="email" placeholder="example@naver.com"/></label>
  <label>비밀번호 * <small>영문+숫자 8자 이상</small><input name="password" type="password" required minLength={8} autoComplete="new-password"/></label>
  <label>비밀번호 확인 *<input name="password2" type="password" required minLength={8} autoComplete="new-password"/></label>
  <label>이름 *<input name="name" required minLength={2} maxLength={20} autoComplete="name"/></label>
  <label>휴대폰번호 *<input name="phone" required type="tel" inputMode="tel" maxLength={13} autoComplete="tel" placeholder="010-1234-5678"/></label>
  <fieldset className="agree-box"><legend>약관 동의</legend>
   <label className="check all"><input type="checkbox" checked={all} onChange={e=>setAgree({terms:e.target.checked,privacy:e.target.checked,age:e.target.checked})}/> <strong>전체 동의</strong></label>
   <label className="check"><input type="checkbox" checked={agree.terms} onChange={e=>setAgree({...agree,terms:e.target.checked})}/> [필수] <Link className="text-link" href="/policy/terms" target="_blank">이용약관</Link> 동의</label>
   <label className="check"><input type="checkbox" checked={agree.privacy} onChange={e=>setAgree({...agree,privacy:e.target.checked})}/> [필수] 개인정보 수집·이용 동의</label>
   <ul className="agree-detail"><li>수집 항목: 이메일(아이디), 비밀번호(암호화 저장), 이름, 휴대폰번호, (주문 시) 배송 주소</li><li>목적: 회원 식별, 주문·배송·A/S 안내</li><li>보유 기간: 회원 탈퇴 시까지 (법령에 따라 주문 기록은 5년 보관) · <Link className="text-link" href="/policy/privacy" target="_blank">개인정보처리방침</Link></li></ul>
   <label className="check"><input type="checkbox" checked={agree.age} onChange={e=>setAgree({...agree,age:e.target.checked})}/> [필수] 만 14세 이상입니다.</label>
  </fieldset>
  {message&&<p className="compat bad" role="alert">{message}</p>}
  <button className="btn primary full" type="submit" disabled={!configured||busy}>{busy?"가입 중...":"회원가입"}</button>
 </form>;
}
