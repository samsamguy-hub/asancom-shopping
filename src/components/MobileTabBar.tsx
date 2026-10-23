"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cartCount, useCart } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";
// 스마트폰 하단 고정 메뉴 (화면 폭 680px 이하에서만 보임, CSS). 로그인 여부는 화면 표시용
const icon = (d: string) => <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  quote: "M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6",
  cart: "M3 4h2l2.4 11h10.2L20 8H6.2M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
};
export default function MobileTabBar({configured}:{configured:boolean}){
 const path=usePathname();const count=cartCount(useCart());const [signedIn,setSignedIn]=useState(false);
 useEffect(()=>{if(!configured)return;const sb=createClient();sb.auth.getSession().then(({data})=>setSignedIn(!!data.session));
  const {data:{subscription}}=sb.auth.onAuthStateChange((_e,s)=>setSignedIn(!!s));return()=>subscription.unsubscribe();},[configured]);
 // 관리자 화면에서는 숨김
 if(path.startsWith("/admin"))return null;
 const tabs=[{href:"/",label:"홈",d:ICONS.home,on:path==="/"},{href:"/products",label:"전체상품",d:ICONS.grid,on:path.startsWith("/products")},{href:"/estimate",label:"견적상담",d:ICONS.quote,on:path.startsWith("/estimate")},{href:"/cart",label:"장바구니",d:ICONS.cart,on:path.startsWith("/cart")||path.startsWith("/checkout"),badge:count},{href:signedIn?"/mypage":"/login",label:signedIn?"마이":"로그인",d:ICONS.user,on:["/mypage","/login","/signup"].some(p=>path.startsWith(p))}];
 return <nav className="mobile-tabbar" aria-label="빠른 메뉴">{tabs.map(t=><Link key={t.label} href={t.href} className={t.on?"on":""} aria-current={t.on?"page":undefined}><span className="tab-icon">{icon(t.d)}{t.badge?<b>{t.badge>99?"99+":t.badge}</b>:null}</span>{t.label}</Link>)}</nav>;
}
