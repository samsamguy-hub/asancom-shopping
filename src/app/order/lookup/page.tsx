import Link from "next/link";
import type { Metadata } from "next";
import OrderLookupForm from "@/components/OrderLookupForm";
export const metadata:Metadata={title:"비회원 주문조회 | 아산컴마트"};
export default function OrderLookupPage(){
 return <div className="wide section login-wrap"><span className="eyebrow blue">ORDER LOOKUP</span><h1>비회원 주문조회</h1><p>주문 완료 화면에 나온 주문번호와 주문할 때 입력한 휴대폰번호를 입력하세요.</p>
  <OrderLookupForm/><p className="login-links">회원이신가요? <Link className="text-link" href="/login?next=/mypage">로그인 후 마이페이지</Link></p></div>;
}
