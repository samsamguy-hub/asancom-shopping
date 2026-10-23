import CartView from "@/components/CartView";
import type { Metadata } from "next";
export const metadata:Metadata={title:"장바구니 | 아산컴마트"};
export default function CartPage(){return <div className="wide section"><div className="page-heading"><span className="eyebrow blue">SHOPPING CART</span><h1>장바구니</h1><p>담은 상품의 현재 가격과 재고를 확인합니다. 이 브라우저에만 저장됩니다.</p></div><CartView/></div>}
