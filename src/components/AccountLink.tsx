"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// 상단 회원 메뉴: 로그인 상태는 브라우저 세션으로만 표시 (화면 표시용. 권한 확인은 각 서버 화면이 다시 함)
export default function AccountLink({configured}:{configured:boolean}){
 const [signedIn,setSignedIn]=useState<boolean|null>(null);const router=useRouter();
 useEffect(()=>{if(!configured)return;const sb=createClient();
  sb.auth.getSession().then(({data})=>setSignedIn(!!data.session));
  const {data:{subscription}}=sb.auth.onAuthStateChange((_e,session)=>setSignedIn(!!session));
  return()=>subscription.unsubscribe();},[configured]);
 if(!configured||signedIn===null)return <span className="account-links"/>;
 return <span className="account-links">{signedIn?<><Link href="/mypage">마이페이지</Link><button type="button" className="link-button" onClick={async()=>{await createClient().auth.signOut();router.replace("/");router.refresh();}}>로그아웃</button></>:<><Link href="/login">로그인</Link><Link href="/signup">회원가입</Link><Link href="/order/lookup">주문조회</Link></>}</span>;
}
