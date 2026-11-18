import Link from "next/link";
import { redirect } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import AdminPager from "@/components/AdminPager";
import { getProductPage, PRODUCT_PAGE_SIZE, type ProductListSort } from "@/lib/products";
import { lastPage, parsePage } from "@/lib/admin-paging";
import { dbConfigured } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
// 정렬 버튼 (메인 추천상품 정렬과 같은 모양). 추천순(기본) = 관리자 지정 추천상품 먼저 → 우선순위 → 최신 등록순 (메인 추천순과 같은 기준)
// 가격순·할인순은 추천 여부와 무관. 같은 값끼리는 최신 등록순 유지. 정렬은 메뉴 상품 전체에 적용한 뒤 12개씩(PRODUCT_PAGE_SIZE) 페이지로 나눔 (lib/products.ts getProductPage)
const SORTS=[{key:"",label:"추천순"},{key:"priceAsc",label:"낮은가격순"},{key:"priceDesc",label:"높은가격순"},{key:"discount",label:"할인순"}] as const;
const SORT_KEYS:readonly string[]=SORTS.map(s=>s.key);
// 프리미엄·한정판은 일반 카테고리 (supabase/product_menus.sql). 예전 주소(?tag=premium|limited)는 카테고리 주소로 이동
const OLD_TAGS:Record<string,string>={premium:"프리미엄",limited:"한정판"};
const CATEGORY_TITLES:Record<string,{title:string;desc:string}>={
 "프리미엄":{title:"프리미엄",desc:"아산컴마트가 엄선한 고급 사양 상품입니다."},
 "한정판":{title:"한정판",desc:"특별 판매·수량 한정 상품입니다."},
 "완제품":{title:"조립컴퓨터",desc:"새 부품으로 조립한 컴퓨터입니다."},
 "중고PC":{title:"중고컴퓨터",desc:"점검을 마친 중고 컴퓨터입니다."},
 "데스크톱세트":{title:"데스크톱세트",desc:"본체와 모니터 등을 함께 구성한 세트 상품입니다."},
 "모니터":{title:"모니터",desc:"모니터 상품입니다."},
};
export default async function ProductsPage({searchParams}:{searchParams:Promise<{q?:string|string[];category?:string|string[];group?:string|string[];tag?:string|string[];sort?:string|string[];page?:string|string[]}>}) {
 const first=(v?:string|string[])=>(Array.isArray(v)?v[0]:v)||"";
 const sp=await searchParams; const rawQ=first(sp.q).trim().slice(0,100);
 if(OLD_TAGS[first(sp.tag)])redirect(`/products?category=${encodeURIComponent(OLD_TAGS[first(sp.tag)])}`);
 const category=first(sp.category);const parts=!category&&first(sp.group)==="parts";
 const sort=(SORT_KEYS.includes(first(sp.sort))?first(sp.sort):"") as ProductListSort;
 const page=parsePage(first(sp.page));
 // 주소: 현재 메뉴(태그·카테고리)·검색어·정렬 유지. 정렬 버튼은 page 를 빼서 1페이지로, 메뉴를 옮기면 메뉴 주소에 page 가 없어 1페이지
 const listHref=(s:string,p:number)=>{const u=new URLSearchParams();if(rawQ)u.set("q",rawQ);if(category)u.set("category",category);else if(parts)u.set("group","parts");if(s)u.set("sort",s);if(p>1)u.set("page",String(p));const qs=u.toString();return qs?`/products?${qs}`:"/products";};
 const {products,total,outOfRange}=await getProductPage({category:category||undefined,parts,q:rawQ||undefined},sort,page);
 // 상품이 줄어 현재 페이지가 없어졌거나 주소에 큰 페이지를 넣은 경우 마지막 페이지로
 if(outOfRange)redirect(listHref(sort,lastPage(total,PRODUCT_PAGE_SIZE)));
 const title=parts?"PC부품":CATEGORY_TITLES[category]?.title||category||"전체 상품";
 const desc=(parts?"CPU·메인보드·메모리·그래픽카드·SSD·파워·케이스·CPU쿨러 전체 부품입니다.":CATEGORY_TITLES[category]?.desc||"원하는 품목을 선택하거나 검색하세요.");
 return <div className="wide section"><div className="page-heading"><span className="eyebrow blue">PRODUCT CATALOG</span><h1>{title}</h1><p>{desc}</p></div><div className="section-heading smallspace" id="product-list"><p><strong>{total}</strong>개의 상품 {rawQ&&`· 검색어: ${rawQ}`}</p></div><nav className="rec-sorts list-sorts" aria-label="상품 정렬">{SORTS.map(s=><Link key={s.key} className={`rec-sort${sort===s.key?" active":""}`} aria-current={sort===s.key?"true":undefined} href={listHref(s.key,1)} scroll={false}>{s.label}</Link>)}</nav><div className="product-grid">{products.map((p,i)=><ProductCard key={p.id} p={p} isDemo={!dbConfigured()} eager={i<4}/>)}</div>{!products.length&&<div className="empty">{rawQ?"조건에 맞는 상품이 없습니다.":"등록된 상품이 없습니다."}</div>}<AdminPager page={page} total={total} href={p=>listHref(sort,p)} size={PRODUCT_PAGE_SIZE} info={false} hash="#product-list"/></div>
}
