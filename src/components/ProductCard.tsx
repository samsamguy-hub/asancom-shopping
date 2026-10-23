import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import PriceTag from "@/components/PriceTag";
import ProductBadges from "@/components/ProductBadges";
import { isSoldOut } from "@/lib/product-status";
import { SPEC_FIELDS, specDisplayValue, specLabel } from "@/lib/specs";
const symbols:Record<string,string>={"CPU":"▣","메인보드":"▦","메모리":"▥","그래픽카드":"◈","SSD":"▤","파워":"⚡","케이스":"▧","CPU쿨러":"❄","완제품":"▣","중고PC":"♻","노트북":"▱","모니터":"▭","주변기기":"✳"};
// 카드용 기본 사양 요약: 완제품 표기(CPU·메모리·GPU·저장장치)가 있으면 값만, 없으면 앞의 사양 3개를 "이름 값"으로
const pcKeys=["cpu","ram","graphics","storage"];
function specSummary(specs:Product["specs"]){
  const entries=Object.entries(specs||{}).filter(([,v])=>v!==undefined&&v!==null&&v!=="");
  const pc=pcKeys.flatMap(k=>{const e=entries.find(([key])=>key===k);return e?[String(e[1])]:[];});
  if(pc.length)return pc.join(" / ");
  return entries.slice(0,3).map(([k,v])=>`${specLabel(k)} ${specDisplayValue(SPEC_FIELDS.find(f=>f.key===k),v)}`).join(" · ");
}
export default function ProductCard({p,isDemo}:{p:Product,isDemo:boolean}){
  const main=p.images?.[0],soldOut=isSoldOut(p),summary=specSummary(p.specs);
  // 중고 표시: 중고상품 체크 또는 중고PC 카테고리
  const used=p.is_used||p.category==="중고PC";
  return <Link className={`product-card${soldOut?" sold-out":""}`} href={`/products/${encodeURIComponent(p.slug)}`}><div className="product-visual">{main?.url?<Image className="product-photo" src={main.url} alt={main.alt_text||p.name} fill sizes="(max-width:680px) 50vw, (max-width:950px) 33vw, 290px"/>:<span>{symbols[p.category]||"▣"}</span>}<ProductBadges p={p}/>{soldOut&&<div className="sold-out-cover" aria-hidden="true">품절</div>}<div className={`used-tag${used?"":" new-tag"}`}>{used?"중고제품":"새제품"}</div></div><div className="product-info"><div className="badges"><span className="tiny-badge">{p.category}</span>{isDemo&&<span className="tiny-badge alt">가상상품</span>}</div><h3>{p.name}</h3>{summary&&<p className="card-specs" title={summary}>{summary}</p>}<PriceTag p={p} soldOut={soldOut}/><p>{soldOut?<span className="sold-out-text">품절 · 주문 불가</span>:`재고표시 ${p.stock}개`}</p></div></Link>;
}
