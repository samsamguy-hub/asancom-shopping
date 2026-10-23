import Link from "next/link";
import type { Metadata } from "next";
import CheckoutForm from "@/components/CheckoutForm";
import { getCustomer } from "@/lib/session";
import { MAX_QTY_PER_ITEM } from "@/lib/cart";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"주문하기 | 아산컴마트"};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// /checkout            : 장바구니 전체 주문
// /checkout?buy=ID&qty=N : 상품 상세에서 바로 구매 (장바구니와 별개)
// guest=1             : 비회원 주문
export default async function CheckoutPage({searchParams}:{searchParams:Promise<{buy?:string,qty?:string,guest?:string}>}){
 const sp=await searchParams;const customer=await getCustomer();
 const qty=Math.max(1,Math.min(MAX_QTY_PER_ITEM,Math.floor(Number(sp.qty))||1));
 const buy=sp.buy&&uuid.test(sp.buy)?{productId:sp.buy,quantity:qty}:null;
 const here=`/checkout${buy?`?buy=${buy.productId}&qty=${qty}`:""}`;
 const guestHref=`${here}${buy?"&":"?"}guest=1`;
 if(!customer&&sp.guest!=="1")return <div className="wide section login-wrap"><span className="eyebrow blue">ORDER</span><h1>주문하기</h1><p>회원으로 주문하면 마이페이지에서 주문 내역을 확인할 수 있습니다.</p>
  <div className="order-choice"><Link className="btn primary full" href={`/login?next=${encodeURIComponent(here)}`}>로그인하고 주문하기</Link><Link className="btn secondary full" href={guestHref}>비회원으로 주문하기</Link><p className="small-muted">아직 회원이 아니신가요? <Link className="text-link" href={`/signup?next=${encodeURIComponent(here)}`}>회원가입</Link></p></div></div>;
 return <div className="wide section"><div className="page-heading"><span className="eyebrow blue">CHECKOUT</span><h1>주문서 작성</h1><p>{customer?`${customer.profile?.name||customer.email}님, 주문 정보를 확인해 주세요.`:"비회원 주문입니다. 주문 후 주문번호와 휴대폰번호로 주문을 조회할 수 있습니다."}</p></div>
  <CheckoutForm member={customer?{email:customer.email,profile:customer.profile}:null} guest={sp.guest==="1"} buy={buy}/></div>;
}
