import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/products";
import { dbConfigured } from "@/lib/supabase/server";
import { categories, partCategories } from "@/lib/types";
export const dynamic="force-dynamic";
export default async function ProductsPage({searchParams}:{searchParams:Promise<{q?:string|string[];category?:string|string[];group?:string|string[]}>}) {
 const first=(v?:string|string[])=>(Array.isArray(v)?v[0]:v)||"";
 const sp=await searchParams; const all=await getProducts(); const q=first(sp.q).trim().toLocaleLowerCase("ko").slice(0,100); const category=first(sp.category);const parts=!category&&first(sp.group)==="parts";
 const result=all.filter(p=>(category?p.category===category:!parts||partCategories.includes(p.category))&&(!q||`${p.name} ${p.description} ${p.category}`.toLocaleLowerCase("ko").includes(q)));
 return <div className="wide section"><div className="page-heading"><span className="eyebrow blue">PRODUCT CATALOG</span><h1>{parts?"PC부품":category||"전체 상품"}</h1><p>{parts?"CPU·메인보드·메모리·그래픽카드·SSD·파워·케이스·CPU쿨러 전체 부품입니다.":"원하는 품목을 선택하거나 검색하세요."}</p></div><div className="filter-pills"><Link className={!category&&!parts?"active":""} href="/products">전체</Link><Link className={parts?"active":""} href="/products?group=parts">PC부품 전체</Link>{categories.map(c=><Link className={c===category?"active":""} key={c} href={`/products?category=${encodeURIComponent(c)}`}>{c}</Link>)}</div><div className="section-heading smallspace"><p><strong>{result.length}</strong>개의 상품 {q&&`· 검색어: ${q}`}</p></div><div className="product-grid">{result.map(p=><ProductCard key={p.id} p={p} isDemo={!dbConfigured()}/>)}</div>{!result.length&&<div className="empty">조건에 맞는 상품이 없습니다.</div>}</div>
}
