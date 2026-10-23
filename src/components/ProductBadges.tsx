import type { Product } from "@/lib/types";
import { isSoldOut, productBadges } from "@/lib/product-status";
// 상품 배지 줄 (카드 사진 위·상세페이지 공용). 한정수량은 남은 재고 수량을 함께 표시
export default function ProductBadges({p,className="product-badges"}:{p:Product,className?:string}){
 const list=productBadges(p),soldOut=isSoldOut(p);
 if(!list.length)return null;
 return <div className={className}>{list.map(b=><span key={b.key} className={`badge badge-${b.cls}`}>{b.key==="한정수량"&&!soldOut&&p.stock<=99?`한정 ${p.stock}개`:b.key}</span>)}</div>;
}
