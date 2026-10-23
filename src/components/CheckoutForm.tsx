"use client";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { placeOrder, type PlaceOrderState } from "@/app/checkout/actions";
import { refreshCart } from "@/app/cart/actions";
import { removeFromCart, setShippingChoice, useCart, useShippingChoice } from "@/lib/cart-store";
import type { CartItem, PricedCart } from "@/lib/cart";
import { formatKRW } from "@/lib/types";
import { BANK, CASH_RECEIPT, DEPOSIT_DAYS, depositDeadline, isPickup, type Profile } from "@/lib/order-rules";
import AddressFields from "@/components/AddressFields";
// 주문서: 주문 상품(서버가 계산한 금액) + 주문자·배송 정보 + 배송 방법 + 무통장입금 + 동의. 최종 금액·재고는 주문 시 DB가 다시 확인
export default function CheckoutForm({member,guest,buy}:{member:{email:string,profile:Profile|null}|null,guest:boolean,buy:CartItem|null}){
 const cart=useCart();const items=useMemo(()=>buy?[buy]:cart,[buy,cart]);
 const savedShip=useShippingChoice();const [shipId,setShipId]=useState<string|null>(null);const shippingId=shipId??savedShip;
 const [priced,setPriced]=useState<PricedCart|null>(null);const [loading,setLoading]=useState(true);
 const [state,action,pending]=useActionState<PlaceOrderState,FormData>(placeOrder,null);
 const [sameAsOrderer,setSame]=useState(true);const [receipt,setReceipt]=useState("none");
 const p=member?.profile;
 useEffect(()=>{let live=true;if(!items.length){setPriced(null);setLoading(false);return;}setLoading(true);refreshCart(items,shippingId||undefined).then(r=>{if(live){setPriced(r);setLoading(false);}}).catch(()=>{if(live)setLoading(false);});return()=>{live=false;};},[items,shippingId]);
 // 주문 완료: 장바구니 주문이면 주문한 상품을 장바구니에서 비움
 useEffect(()=>{if(state?.ok&&!buy)removeFromCart(items.map(i=>i.productId));},[state,buy,items]);
 if(state?.ok)return <div className="order-done"><span className="eyebrow blue">ORDER COMPLETE</span><h1>주문이 접수되었습니다</h1>
  <div className="bank-box"><p>아래 계좌로 <strong>{depositDeadline(new Date())}까지</strong>({DEPOSIT_DAYS}일 이내) 입금해 주세요. 입금이 확인되면 상품을 준비합니다.</p>
   <dl><div><dt>주문번호</dt><dd><strong>{state.orderNo}</strong></dd></div><div><dt>입금하실 금액</dt><dd><strong className="price-strong">{formatKRW(state.total)}</strong> (VAT 포함)</dd></div><div><dt>입금 계좌</dt><dd>{BANK.bank} <strong>{BANK.account}</strong></dd></div><div><dt>예금주</dt><dd>{BANK.holder}</dd></div></dl>
   <p className="small-muted">입금 기한이 지나면 주문이 자동으로 취소됩니다. 입금자명이 주문 시 입력한 이름과 다르면 고객센터(041-542-3342)로 알려 주세요.</p></div>
  {state.guest?<p className="compat neutral">비회원 주문은 <strong>주문번호</strong>와 <strong>주문자 휴대폰번호</strong>로 <Link className="text-link" href="/order/lookup">주문 조회</Link>에서 확인할 수 있습니다. 주문번호를 꼭 메모해 두세요.</p>:<p className="compat neutral"><Link className="text-link" href="/mypage">마이페이지</Link>에서 주문 내역을 확인할 수 있습니다.</p>}
  <div className="detail-actions"><Link className="btn primary" href="/products">쇼핑 계속하기</Link></div></div>;
 if(loading&&!priced)return <div className="empty">주문 정보를 불러오는 중...</div>;
 if(!items.length||!priced)return <div className="empty">주문할 상품이 없습니다. <Link className="text-link" href="/products">상품 보러 가기</Link></div>;
 const pickup=priced.shipping?isPickup(priced.shipping.name):false;const hasCustomPc=priced.lines.some(l=>l.category==="완제품");
 const blocked=!priced.orderable;
 return <form className="checkout" onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);fd.set("items",JSON.stringify(items));fd.set("expected_total",String(priced.total));fd.set("shipping_id",priced.shipping?.id||"");fd.set("guest",member?"0":guest?"1":"0");
   if(sameAsOrderer&&!pickup){fd.set("receiver_name",String(fd.get("orderer_name")||""));fd.set("receiver_phone",String(fd.get("orderer_phone")||""));}
   startTransition(()=>action(fd));}}>
  <div className="checkout-main">
   <section className="checkout-box"><h2>주문 상품</h2><ul className="checkout-lines">{priced.lines.map(l=><li key={l.productId} className={l.status==="ok"?"":"bad"}><span>{l.name||"판매하지 않는 상품"}{l.message&&<small>{l.message}</small>}</span><span>{l.quantity}개</span><strong>{formatKRW(l.lineTotal)}</strong></li>)}</ul>
    {blocked&&<p className="compat bad">주문할 수 없는 상품이 있습니다. {buy?<Link className="text-link" href="/products">상품 다시 보기</Link>:<Link className="text-link" href="/cart">장바구니에서 수정하기</Link>}</p>}</section>
   <section className="checkout-box"><h2>주문자 정보</h2>{member&&<p className="small-muted">회원 정보로 채웠습니다. 바꾸면 이번 주문에만 적용됩니다.</p>}<div className="form-grid">
    <label>이름 *<input name="orderer_name" required minLength={2} maxLength={20} autoComplete="name" defaultValue={p?.name||""}/></label>
    <label>휴대폰번호 *<input name="orderer_phone" required type="tel" inputMode="tel" maxLength={13} autoComplete="tel" defaultValue={p?.phone||""} placeholder="010-1234-5678"/></label>
    <label>이메일 (선택)<input name="orderer_email" type="email" maxLength={120} autoComplete="email" defaultValue={member?.email||""}/></label></div></section>
   <section className="checkout-box"><h2>배송 방법</h2><div className="shipping-list">{priced.shippingOptions.map(o=><label key={o.id} className={`shipping-option${priced.shipping?.id===o.id?" selected":""}`}><input type="radio" name="ship" checked={priced.shipping?.id===o.id} onChange={()=>{setShipId(o.id);setShippingChoice(o.id);}}/><span><strong>{o.name}{o.lead_time&&<span className="lead-time">{o.lead_time}</span>}</strong>{o.description&&<small>{o.description}</small>}</span><em>{o.fee?formatKRW(o.fee):"무료"}</em></label>)}</div>
    {!priced.shippingOptions.length&&<p className="compat bad">선택할 수 있는 배송 방법이 없습니다. 전화로 주문해 주세요.</p>}</section>
   {priced.shipping&&(pickup?<section className="checkout-box"><h2>방문 수령 안내</h2><p>매장(충청남도 아산시 온천대로 1408, 온양고 앞)에서 직접 받아 가세요. 입금 확인 후 준비가 끝나면 연락드립니다.</p><label>요청사항 (선택)<input name="delivery_memo" maxLength={200} placeholder="방문 예정일 등"/></label></section>
   :<section className="checkout-box"><h2>배송 정보</h2><label className="check"><input type="checkbox" checked={sameAsOrderer} onChange={e=>setSame(e.target.checked)}/> 주문자와 받는 분이 같아요</label>
    <div className="form-grid">{!sameAsOrderer&&<><label>받는 분 *<input name="receiver_name" required minLength={2} maxLength={20}/></label><label>받는 분 연락처 *<input name="receiver_phone" required type="tel" inputMode="tel" maxLength={13} placeholder="010-1234-5678"/></label></>}
     <AddressFields required defaults={{zipcode:p?.zipcode,address1:p?.address1,address2:p?.address2}}/>
     <label>배송 메모 (선택)<input name="delivery_memo" maxLength={200} placeholder="부재 시 경비실에 맡겨 주세요"/></label></div></section>)}
   <section className="checkout-box"><h2>결제 방법</h2><label className="shipping-option selected"><input type="radio" checked readOnly/><span><strong>무통장입금</strong><small>{BANK.bank} {BANK.account} · 예금주 {BANK.holder}</small></span><em>{DEPOSIT_DAYS}일 이내 입금</em></label>
    <div className="form-grid"><label>입금자명<input name="depositor_name" maxLength={20} placeholder="비우면 주문자 이름"/></label>
     <label>현금영수증<select name="cash_receipt_type" value={receipt} onChange={e=>setReceipt(e.target.value)}>{Object.entries(CASH_RECEIPT).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
     {receipt!=="none"&&<label>{receipt==="income"?"휴대폰번호":"사업자등록번호"} *<input name="cash_receipt_number" required inputMode="numeric" maxLength={13}/></label>}</div></section>
   <section className="checkout-box consent-box"><h2>약관 동의</h2>
    <label className="check"><input type="checkbox" name="agree_terms" required/> [필수] <Link className="text-link" href="/policy/terms" target="_blank">이용약관</Link>에 동의합니다.</label>
    <label className="check"><input type="checkbox" name="agree_privacy" required/> [필수] 개인정보 수집·이용에 동의합니다.</label>
    <ul><li>수집 항목: 주문자 이름·휴대폰번호·이메일, 받는 분 이름·연락처·주소, 입금자명, 현금영수증 번호</li><li>목적: 주문 처리, 배송·수령 안내, 입금 확인, 교환·반품·A/S</li><li>보유 기간: 전자상거래법에 따라 주문 기록 5년 (<Link className="text-link" href="/policy/privacy" target="_blank">개인정보처리방침</Link>)</li></ul>
    {hasCustomPc&&<label className="check"><input type="checkbox" name="agree_custom" required/> [필수] 조립PC는 주문에 따라 조립하는 상품으로, 조립 후에는 단순 변심에 의한 교환·반품이 제한될 수 있음을 확인했습니다. (불량·표시와 다른 경우 제외, <Link className="text-link" href="/policy/returns" target="_blank">교환·반품 안내</Link>)</label>}
    <label className="check"><input type="checkbox" name="agree_order" required/> [필수] 주문 상품·금액·배송 정보를 확인했으며 구매에 동의합니다.</label></section>
  </div>
  <aside className="builder-summary cart-summary checkout-summary"><h2>결제 금액</h2>
   <div className="summary-lines"><div><span>상품 금액</span><strong>{formatKRW(priced.subtotal)}</strong></div><div><span>배송비{priced.shipping&&` (${priced.shipping.name})`}</span><strong>{priced.shipping?formatKRW(priced.shippingFee):"선택 필요"}</strong></div><div><span>공급가 합계</span><strong>{formatKRW(priced.supplyTotal)}</strong></div><div><span>부가세 (10%)</span><strong>{formatKRW(priced.vat)}</strong></div></div>
   <div className="summary-total"><span>최종 결제 금액<small> VAT 포함</small></span><strong>{formatKRW(priced.total)}</strong></div>
   {state&&!state.ok&&<p className="compat bad" role="alert">{state.message}</p>}
   <button className="btn primary full" type="submit" disabled={pending||blocked||!priced.shipping}>{pending?"주문 중...":`${formatKRW(priced.total)} 주문하기`}</button>
   <p className="small-muted">{member?"회원 주문":"비회원 주문"} · 무통장입금. 주문 후 안내되는 계좌로 입금해 주세요. 주문 시 서버가 가격과 재고를 다시 확인합니다.</p></aside>
 </form>;
}
