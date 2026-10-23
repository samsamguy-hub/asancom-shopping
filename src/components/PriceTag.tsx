import type { Product } from "@/lib/types";
import { formatKRW } from "@/lib/types";
import { discountRate } from "@/lib/product-status";
import { VAT_LABEL, withVat } from "@/lib/pricing";
// 판매가 표시 (모든 가격은 VAT 별도). 정상가가 판매가보다 높을 때만 정상가(취소선)와 할인율을 함께 보여줌
// showVatIncluded: 상세페이지처럼 부가세 포함 금액도 함께 안내할 때
export default function PriceTag({p,soldOut=false,className="price-tag",showVatIncluded=false}:{p:Pick<Product,"price"|"list_price">,soldOut?:boolean,className?:string,showVatIncluded?:boolean}){
 const rate=discountRate(p);
 return <div className={`${className}${soldOut?" sold-out-price":""}`}>{rate>0&&<span className="list-price"><span className="sr-only">정상가 </span><s>{formatKRW(p.list_price!)}</s></span>}<span className="sale-row">{rate>0&&<em className="discount-rate">{rate}%</em>}<strong>{formatKRW(p.price)}</strong><small className="vat-note">{VAT_LABEL}</small></span>{showVatIncluded&&<span className="vat-included">부가세 포함 {formatKRW(withVat(p.price))}</span>}</div>;
}
