"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QuantityInput from "@/components/QuantityInput";
import { addToCart } from "@/lib/cart-store";
import { MAX_QTY_PER_ITEM } from "@/lib/cart";
// 상세페이지 담기 버튼. 표시된 재고 기준으로 수량을 제한하고, 실제 재고·가격·품절 여부는 장바구니 화면에서 서버가 다시 확인
export default function AddToCart({productId,stock,soldOut=false}:{productId:string,stock:number,soldOut?:boolean}){
 const max=soldOut?0:Math.min(stock,MAX_QTY_PER_ITEM);const [qty,setQty]=useState(1);const [msg,setMsg]=useState<{ok:boolean,text:string}|null>(null);const router=useRouter();
 // 바로 구매: 장바구니와 별개로 이 상품만 주문서로. 회원 구매는 로그인 안 했으면 주문 화면에서 로그인 안내
 const buyHref=(guest:boolean)=>`/checkout?buy=${productId}&qty=${qty}${guest?"&guest=1":""}`;
 if(max<=0)return <div className="add-to-cart"><button className="btn secondary full" type="button" disabled>품절 · 주문 불가</button><p className="small-muted">재입고 여부는 전화로 문의해 주세요.</p></div>;
 return <div className="add-to-cart"><div className="add-row"><QuantityInput value={qty} max={max} onChange={setQty}/><button className="btn secondary" type="button" onClick={()=>{const r=addToCart(productId,qty,max);setMsg({ok:r.ok,text:r.message});setQty(1);}}>장바구니 담기</button></div>
 <div className="buy-row"><button className="btn buy" type="button" onClick={()=>router.push(buyHref(false))}>구매하기</button><button className="btn secondary" type="button" onClick={()=>router.push(buyHref(true))}>비회원 구매</button></div>
 {msg&&<p className={`compat ${msg.ok?"good":"bad"}`} role="status">{msg.text} <Link className="text-link" href="/cart">장바구니 보기 →</Link></p>}</div>;
}
