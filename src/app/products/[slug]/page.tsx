import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { dbConfigured } from "@/lib/supabase/server";
import { SPEC_FIELDS, specDisplayValue, specLabel } from "@/lib/specs";
import AddToCart from "@/components/AddToCart";
import ProductBadges from "@/components/ProductBadges";
import PriceTag from "@/components/PriceTag";
import { isSoldOut, soldOutReason } from "@/lib/product-status";
import ProductReviews, { stars } from "@/components/ProductReviews";
import { getApprovedReviews } from "@/lib/reviews";
import { getShippingOptions } from "@/lib/shipping";
import { RETURN_POLICY_SUMMARY } from "@/lib/policy";
import { VAT_LABEL } from "@/lib/pricing";
import { formatKRW } from "@/lib/types";
import type { Metadata } from "next";
// 60초 캐시 (관리자 저장·리뷰 승인 시 즉시 갱신). 처음 열 때 만들어 두고 이후 바로 보여줌
export const revalidate=60;
export async function generateStaticParams(){return [];}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;const p=await getProductBySlug(slug);if(!p)return {title:"상품을 찾을 수 없습니다 | 아산컴마트"};
 const description=(p.description||`${p.category} ${p.name}`).slice(0,150);const image=p.images?.find(i=>i.url)?.url;
 return {title:`${p.name} | 아산컴마트`,description,alternates:{canonical:`/products/${encodeURIComponent(p.slug)}`},openGraph:{title:p.name,description,type:"website",images:image?[{url:image}]:undefined}};
}
export default async function Detail({params}:{params:Promise<{slug:string}>}){const {slug}=await params; const p=await getProductBySlug(slug);if(!p)notFound();const [shipping,reviews]=await Promise.all([getShippingOptions(),getApprovedReviews(p.id)]);const soldOut=isSoldOut(p);const used=p.is_used||p.category==="중고PC";const photos=(p.images||[]).filter(img=>img.url);return <div className="wide section"><Link href="/products" className="text-link">← 상품목록</Link><div className="detail-grid">{photos.length?<div className="detail-photos"><div className="detail-main"><Image className="main-photo" src={photos[0].url!} alt={photos[0].alt_text||p.name} width={1000} height={1000} sizes="(max-width:950px) 100vw, 572px" priority/><div className={`used-tag${used?"":" new-tag"}`}>{used?"중고제품":"새제품"}</div></div>{photos.length>1&&<div className="detail-thumbs">{photos.slice(1).map(img=><Image key={img.id} src={img.url!} alt={img.alt_text||p.name} width={200} height={200} sizes="120px"/>)}</div>}</div>:<div className="detail-visual"><span>▣</span><small>아산컴마트 PC 전문몰</small></div>}<div className="detail-body"><span className="tiny-badge">{p.category}</span>{!dbConfigured()&&<span className="tiny-badge alt">가상상품</span>}<ProductBadges p={p} className="product-badges inline"/><h1>{p.name}</h1>{reviews.count>0&&<a className="review-score-link" href="#reviews"><span aria-hidden="true">{stars(reviews.average)}</span> {reviews.average.toFixed(1)} · 리뷰 {reviews.count}개</a>}<p className="body-description">{p.description}</p><PriceTag p={p} soldOut={soldOut} className="price-line" showVatIncluded/>{soldOut&&<p className="compat bad"><strong>품절 · 주문 불가</strong>{soldOutReason(p)} 재입고 여부는 전화로 문의해 주세요.</p>}<p className="muted">재고: {soldOut?'품절':`${p.stock}개 표시`} · {used?'중고제품':'새제품'}</p>{Object.keys(p.specs||{}).length>0&&<div className="specs"><h3>주요 사양</h3>{Object.entries(p.specs).map(([k,v])=><div key={k}><span>{specLabel(k)}</span><strong>{specDisplayValue(SPEC_FIELDS.find(f=>f.key===k),v)}</strong></div>)}</div>}<AddToCart productId={p.id} stock={p.stock} soldOut={soldOut}/><div className="detail-actions"><a className="btn secondary" href="tel:0415423342">전화로 재고·가격 문의</a><Link className="btn secondary" href="/estimate">PC 견적 상담</Link></div><p className="small-muted">※ 결제는 무통장입금으로 진행되며, 주문 시 가격과 재고를 서버에서 다시 확인합니다.</p></div></div>
 <nav className="detail-tabs" aria-label="상품 정보"><a href="#shipping">배송·설치 안내</a><a href="#returns">교환·반품·취소</a><a href="#reviews">리뷰 {reviews.count>0&&`(${reviews.count})`}</a></nav>
 <section className="detail-section" id="shipping"><h2>배송·설치 안내</h2>{shipping.length?<table className="info-table"><thead><tr><th>방법</th><th>소요 기간</th><th>비용</th></tr></thead><tbody>{shipping.map(o=><tr key={o.id}><td><strong>{o.name}</strong>{o.description&&<small>{o.description}</small>}</td><td>{o.lead_time||"문의"}</td><td>{o.fee?<>{formatKRW(o.fee)} <small>({VAT_LABEL})</small></>:"무료"}</td></tr>)}</tbody></table>:<p className="muted">배송·설치 방법과 비용은 주문 상담 시 안내해 드립니다.</p>}<p className="small-muted">소요 기간은 주문 확인(결제 완료) 후 기준이며, 재고·주말·공휴일·지역 사정에 따라 달라질 수 있습니다. 배송·설치 방법은 장바구니에서 선택합니다.</p></section>
 <section className="detail-section" id="returns"><h2>교환·반품·취소</h2><ul className="policy-summary">{RETURN_POLICY_SUMMARY.map((t,i)=><li key={i}>{t}</li>)}</ul><Link className="text-link" href="/policy/returns">교환·반품·취소 자세히 보기 →</Link></section>
 <ProductReviews productId={p.id} summary={reviews} canWrite={dbConfigured()}/>
 </div>}
