"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QuantityInput from "@/components/QuantityInput";
import { refreshCart } from "@/app/cart/actions";
import { removeFromCart, setCartQuantity, setShippingChoice, useCart, useShippingChoice } from "@/lib/cart-store";
import { formatKRW } from "@/lib/types";
import { VAT_LABEL } from "@/lib/pricing";
import type { PricedCart } from "@/lib/cart";
// 장바구니 화면: 담긴 id·수량·배송 방법 id 를 서버로 보내 현재 가격·재고·배송비·부가세를 받아 표시. 금액 계산은 모두 서버 결과만 사용
export default function CartView(){
 const items=useCart(),shippingId=useShippingChoice();
 const [hydrated,setHydrated]=useState(false);
 const [priced,setPriced]=useState<PricedCart|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [shipNote,setShipNote]=useState("");
 const request=useRef(0);
 const key=JSON.stringify([items,shippingId]);
 useEffect(()=>setHydrated(true),[]);
 useEffect(()=>{
  if(!hydrated)return;
  if(!items.length){setPriced(null);return;}
  const id=++request.current;setLoading(true);
  // 수량을 빠르게 바꿀 때 요청이 몰리지 않게 잠시 기다렸다가 확인. 늦게 도착한 이전 응답은 무시
  const timer=setTimeout(async()=>{
   try{
    const result=await refreshCart(items,shippingId);if(id!==request.current)return;
    setPriced(result);setError("");
    // 재고보다 많이 담긴 상품: 서버가 정한 수량으로 장바구니를 고치고 안내 문구 유지
    const adjusted=result.lines.filter(l=>l.status==="adjusted"&&l.quantity>0);
    if(adjusted.length){setNotes(n=>({...n,...Object.fromEntries(adjusted.map(l=>[l.productId,l.message||""]))}));adjusted.forEach(l=>setCartQuantity(l.productId,l.quantity));}
    // 없어진 배송 방법: 선택 해제 후 다시 고르도록 안내
    if(result.shippingMessage){setShipNote(result.shippingMessage);setShippingChoice(null);}
   }catch{if(id===request.current)setError("가격·재고를 확인하지 못했습니다. 잠시 후 다시 시도하세요.");}
   finally{if(id===request.current)setLoading(false);}
  },250);
  return()=>clearTimeout(timer);
 },[key,hydrated]);
 if(!hydrated)return <div className="empty">장바구니를 불러오는 중...</div>;
 if(!items.length)return <div className="empty">장바구니가 비어 있습니다. <Link className="text-link" href="/products">상품 보러 가기 →</Link></div>;
 const lineOf=(id:string)=>priced?.lines.find(l=>l.productId===id);
 const blocked=priced?.lines.filter(l=>l.status==="sold_out"||l.status==="unavailable")||[];
 const productsOk=priced&&priced.lines.every(l=>l.status==="ok");
 return <div className="cart-layout"><div className="cart-lines">
  {items.map(item=>{const line=lineOf(item.productId);const dead=line?.status==="sold_out"||line?.status==="unavailable";
   return <div className={`cart-line${dead?" dead":""}`} key={item.productId}>
    <div className="cart-thumb">{line?.imageUrl?<Image src={line.imageUrl} alt={line.imageAlt||""} width={144} height={144} sizes="72px"/>:<span aria-hidden="true">▣</span>}</div>
    <div className="cart-info">{line?.slug?<Link href={`/products/${encodeURIComponent(line.slug)}`}><strong>{line.name}</strong></Link>:<strong>{line?"판매 중지된 상품":"확인 중..."}</strong>}
     {line?.unitPrice!==undefined&&<span className="muted">{formatKRW(line.unitPrice)} <small>({VAT_LABEL})</small> · 재고 {line.stock??0}개</span>}
     {line?.status==="sold_out"&&<span className="cart-status bad">{line.message}</span>}
     {line?.status==="unavailable"&&<span className="cart-status bad">{line.message}</span>}
     {notes[item.productId]&&!dead&&<span className="cart-status warn">{notes[item.productId]}</span>}</div>
    <QuantityInput value={item.quantity} max={line&&!dead?line.maxQuantity:99} disabled={dead} onChange={n=>{setNotes(({[item.productId]:_,...rest})=>rest);setCartQuantity(item.productId,n);}} label={`${line?.name||"상품"} 수량`}/>
    <strong className="cart-total">{line&&!dead?formatKRW(line.lineTotal):"—"}</strong>
    <button type="button" className="link-button danger" onClick={()=>removeFromCart([item.productId])}>삭제</button>
   </div>;})}
  {blocked.length>0&&<button type="button" className="btn secondary" onClick={()=>removeFromCart(blocked.map(l=>l.productId))}>품절·판매중지 상품 {blocked.length}개 삭제</button>}
  <section className="shipping-choice"><h2>배송·설치 방법</h2>
   {shipNote&&<p className="compat warn">{shipNote}</p>}
   {priced&&!priced.shippingOptions.length?<p className="compat neutral">배송·설치 방법과 비용은 주문 상담 시 안내해 드립니다.</p>:
   <div className="shipping-list" role="radiogroup" aria-label="배송·설치 방법">{(priced?.shippingOptions||[]).map(o=><label key={o.id} className={`shipping-option${shippingId===o.id?" selected":""}`}><input type="radio" name="shipping" value={o.id} checked={shippingId===o.id} onChange={()=>{setShipNote("");setShippingChoice(o.id);}}/><span><strong>{o.name}{o.lead_time&&<span className="lead-time">{o.lead_time}</span>}</strong>{o.description&&<small>{o.description}</small>}</span><em>{o.fee>0?`${formatKRW(o.fee)}`:"무료"}{o.fee>0&&<small> ({VAT_LABEL})</small>}</em></label>)}</div>}
  </section>
 </div>
 <aside className="builder-summary cart-summary"><h2>결제 예정 금액</h2>
  <div className="summary-lines">
   <div><span>상품 금액 ({priced?`${priced.itemCount}개`:"—"})</span><strong>{priced?formatKRW(priced.subtotal):"—"}</strong></div>
   <div><span>배송·설치비{priced?.shipping?` (${priced.shipping.name})`:""}</span><strong>{priced?.shipping?(priced.shippingFee?formatKRW(priced.shippingFee):"무료"):"선택 필요"}</strong></div>
   <div><span>공급가 합계</span><strong>{priced?formatKRW(priced.supplyTotal):"—"}</strong></div>
   <div><span>부가세 (10%)</span><strong>{priced?formatKRW(priced.vat):"—"}</strong></div>
  </div>
  <div className="summary-total"><span>최종 결제 금액<small> VAT 포함</small></span><strong>{priced?formatKRW(priced.total):"—"}</strong></div>
  {loading&&<p className="small-muted">현재 가격·재고 확인 중...</p>}
  {error&&<p className="compat bad" role="alert">{error}</p>}
  {priced&&!loading&&!productsOk&&<p className="compat warn">품절·판매중지 상품이 있거나 수량이 조정되었습니다. 내용을 확인해 주세요.</p>}
  {priced&&!loading&&productsOk&&!priced.shipping&&priced.shippingOptions.length>0&&<p className="compat warn">배송·설치 방법을 선택해 주세요.</p>}
  {priced&&!loading&&priced.orderable?<><Link className="btn primary full" href="/checkout">{formatKRW(priced.total)} 주문하기</Link><Link className="btn secondary full" href="/checkout?guest=1">비회원 주문하기</Link></>:<button className="btn primary full" type="button" disabled>{priced?`${formatKRW(priced.total)} 주문하기`:"주문하기"}</button>}
  <p className="small-muted">상품 가격과 배송·설치비는 {VAT_LABEL} 금액이며, 결제 시 부가세 10%가 더해집니다. 결제는 무통장입금으로 진행되며, 전화 주문은 <a className="text-link" href="tel:0415423342">041-542-3342</a>로 문의하세요.<br/>금액은 {priced?new Date(priced.checkedAt).toLocaleTimeString("ko-KR"):"-"} 기준이며, 주문 시 서버에서 가격·재고·배송비를 다시 확인합니다. 장바구니에 담아도 재고가 예약되지 않습니다.</p>
 </aside></div>;
}
