import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import type { Product } from "@/lib/types";
import { formatKRW } from "@/lib/types";
import { moveProductsToTrash, setFeaturedRank, toggleProduct, toggleSoldOut } from "@/app/admin/actions";
import { BULK_FORM_ID, BulkDeleteBar, SelectAllCheckbox } from "@/components/BulkDelete";
import ConfirmButton from "@/components/ConfirmButton";
import ProductBadges from "@/components/ProductBadges";
import { discountRate, FEATURED_MAX_RANK, isFeatured } from "@/lib/product-status";
import AdminPager from "@/components/AdminPager";
import { keepPageInRange, pageRange, parsePage } from "@/lib/admin-paging";
import { adminProductSearch, cleanAdminQuery } from "@/lib/admin-search";
import LogoutButton from "@/components/LogoutButton";
import VisitStats from "@/components/VisitStats";
export const dynamic="force-dynamic";
const deleteErrors:Record<string,string>={none:"상품을 선택하세요.",too_many:"한 번에 200개까지 처리할 수 있습니다.",sql:"휴지통 기능을 쓰려면 Supabase SQL Editor에서 supabase/product_trash.sql을 먼저 실행하세요.",db:"처리하지 못했습니다. 잠시 후 다시 시도하세요."};
export default async function AdminPage({searchParams}:{searchParams:Promise<{trashed?:string,delete_error?:string,visits?:string,page?:string,q?:string}>}){const db=await requireAdmin();const sp=await searchParams;
 // 10개씩: 최신 등록순(같은 시각이면 id 순으로 고정해 페이지 사이 중복·누락 방지)으로 현재 페이지 범위만 조회 + 전체 개수
 // 검색(?q=)도 같은 조회에서 DB 조건으로 처리 (lib/admin-search.ts). 검색하면 1페이지, 페이지를 넘겨도 검색어 유지
 const page=parsePage(sp.page),{from,to}=pageRange(page),q=cleanAdminQuery(sp.q),search=adminProductSearch(q);
 const listParams=(p:number)=>{const u=new URLSearchParams();if(q)u.set("q",q);if(sp.visits)u.set("visits",sp.visits);if(p>1)u.set("page",String(p));return u.toString();};
 const href=(p:number)=>{const s=listParams(p);return s?`/admin?${s}`:"/admin";};
 // 수정 화면·삭제 후 지금 보던 검색어·페이지로 돌아오기 위한 값
 const back=listParams(page);
 // 휴지통 상품(deleted_at 있음)은 목록에서 빼고 개수만 표시. deleted_at 열이 아직 없으면(SQL 미적용) 모두 일반 상품
 const listQuery=(trash:boolean)=>{let r=db.from("products").select("*",{count:"exact"});if(trash)r=r.is("deleted_at",null);if(search)r=r.or(search);return r.order("created_at",{ascending:false}).order("id",{ascending:false}).range(from,to);};
 let trashReady=true,res=await listQuery(true);
 if(res.error?.code==="42703"){trashReady=false;res=await listQuery(false);}
 // 요약 숫자·페이지 범위 확인용 개수 조회 (해당 열이 아직 없으면 0). 요약 숫자는 검색과 관계없이 전체 기준
 const live=()=>{const r=db.from("products").select("id",{count:"exact",head:true});return trashReady?r.is("deleted_at",null):r;};
 await keepPageInRange(page,res.count,res.error?.code,href,()=>search?live().or(search):live());
 if(res.error)throw new Error(res.error.message);
 const products=(res.data||[]) as Product[],total=res.count||0;
 const count=async(r:PromiseLike<{count:number|null}>)=>(await r).count||0;
 const [allCount,activeCount,soldOutCount,featuredCount,trashCount]=await Promise.all([search?count(live()):total,count(live().eq("active",true)),count(live().or("sold_out.eq.true,stock.lte.0")),count(live().not("featured_rank","is",null)),trashReady?count(db.from("products").select("id",{count:"exact",head:true}).not("deleted_at","is",null)):0]);
 // 검토 대기 리뷰 수 (리뷰 테이블이 아직 없으면 0)
 const pendingReviews=(await db.from("product_reviews").select("id",{count:"exact",head:true}).eq("status","pending")).count||0;
 // 입금 대기 주문 수 (주문 테이블이 아직 없으면 0)
 const pendingOrders=(await db.from("orders").select("id",{count:"exact",head:true}).eq("status","pending")).count||0;
 // 새 A/S 접수 수 (A/S 테이블이 아직 없으면 0)
 const newAs=(await db.from("as_requests").select("id",{count:"exact",head:true}).eq("status","received")).count||0;
 // 새 홈페이지·앱·창업 문의 수 (문의 테이블이 아직 없으면 0)
 const newInquiries=(await db.from("business_inquiries").select("id",{count:"exact",head:true}).eq("status","received")).count||0;
 // 새 견적 문의 수 (견적 테이블이 아직 없으면 0)
 const newEstimates=(await db.from("estimate_requests").select("id",{count:"exact",head:true}).eq("status","received")).count||0;
 return <div className="wide section"><div className="admin-heading admin-heading-menu"><div><span className="eyebrow blue">ADMIN DASHBOARD</span><h1>아산컴마트 상품 관리</h1><p>실제 등록한 상품·가격·재고를 수정합니다.</p></div><div className="admin-actions admin-menu"><Link href="/admin/products/new" className="btn primary">+ 새 상품 등록</Link><Link href="/admin/orders" className="btn primary">주문 관리{pendingOrders>0&&<span className="cart-badge gray">{pendingOrders}</span>}</Link><Link href="/admin/products/import" className="btn secondary">CSV 일괄등록</Link><Link href="/admin/shipping" className="btn secondary">배송·설치비 관리</Link><Link href="/admin/as" className="btn secondary">A/S 접수{newAs>0&&<span className="cart-badge">{newAs}</span>}</Link><Link href="/admin/estimates" className="btn secondary">견적 문의{newEstimates>0&&<span className="cart-badge">{newEstimates}</span>}</Link><Link href="/admin/estimate-parts" className="btn secondary">견적 부품 관리</Link><Link href="/admin/inquiries" className="btn secondary">홈페이지·앱·창업 문의{newInquiries>0&&<span className="cart-badge">{newInquiries}</span>}</Link><Link href="/admin/reviews" className="btn secondary">리뷰 관리{pendingReviews>0&&<span className="cart-badge">{pendingReviews}</span>}</Link><Link href="/admin/trash" className="btn secondary">🗑 휴지통{trashCount>0&&<span className="cart-badge gray">{trashCount}</span>}</Link><LogoutButton/></div></div>
 <VisitStats db={db} period={sp.visits}/>
 <div className="stats"><div><span>총 등록</span><strong>{allCount}개</strong></div><div><span>판매 공개</span><strong>{activeCount}개</strong></div><div><span>품절 (지정·재고 0)</span><strong>{soldOutCount}개</strong></div><div><span>추천상품</span><strong>{featuredCount}개</strong></div></div>
 {sp.trashed&&<p className="compat good" role="status">상품 {Number(sp.trashed)||0}개를 휴지통으로 옮겼습니다. <Link className="text-link" href="/admin/trash">휴지통에서 복구하기 →</Link></p>}{sp.delete_error&&<p className="compat bad" role="alert">{deleteErrors[sp.delete_error]||deleteErrors.db}</p>}
 <form className="admin-search" action="/admin" role="search">{sp.visits&&<input type="hidden" name="visits" value={sp.visits}/>}<input type="search" name="q" defaultValue={q} maxLength={100} enterKeyHint="search" aria-label="상품 검색" placeholder="상품명·제품번호·분류·설명 검색 (예: 라이젠, RTX5070, 중고컴퓨터)"/><button className="btn primary small" type="submit">검색</button>{q&&<Link className="btn secondary small" href={sp.visits?`/admin?visits=${encodeURIComponent(sp.visits)}`:"/admin"}>초기화</Link>}</form>
 {q&&<p className="admin-search-result" role="status">&lsquo;<strong>{q}</strong>&rsquo; 검색 결과 <strong>{total.toLocaleString("ko-KR")}</strong>개</p>}
 {products.length>0&&<BulkDeleteBar actions={[{action:moveProductsToTrash,label:"선택 삭제 (휴지통으로)",confirm:"선택한 상품 {count}개를 휴지통으로 옮길까요?\n고객 화면에서 바로 사라지며, 휴지통에서 복구할 수 있습니다.",danger:true}]}/>}
 <p className="admin-scroll-hint">표를 옆으로 밀면 공개·추천·관리 버튼이 보입니다 →</p><div className="table-wrap"><table className="admin-table product-admin-table"><colgroup><col className="c-check"/><col className="c-name"/><col className="c-cat"/><col className="c-price"/><col className="c-stock"/><col className="c-active"/><col className="c-sold"/><col className="c-featured"/><col className="c-actions"/></colgroup><thead><tr><th className="check-col"><SelectAllCheckbox/></th><th>상품명</th><th>분류</th><th>가격</th><th>재고</th><th>공개</th><th>품절</th><th title="숫자가 작을수록 추천순에서 먼저 보입니다. 비우고 저장하면 추천 해제">추천 (순위)</th><th>관리</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td className="check-col"><input type="checkbox" name="ids" value={p.id} form={BULK_FORM_ID} aria-label={`${p.name} 선택`}/></td><td className="col-name"><span className="admin-product-name">{p.name}</span><ProductBadges p={p} className="product-badges inline"/></td><td className="col-center">{p.category}</td><td className="col-price">{formatKRW(p.price)}{discountRate(p)>0&&<small className="admin-list-price">정상가 {formatKRW(p.list_price!)} · {discountRate(p)}% 할인</small>}</td><td className="col-center">{p.stock}</td><td className="col-center"><span className={`state-chip${p.active?" on":""}`}>{p.active?"공개":"비공개"}</span></td><td className="col-center">{p.sold_out?<span className="sold-out-text">품절 지정</span>:p.stock<=0?<span className="sold-out-text">재고 0</span>:"판매 가능"}</td><td className="col-center"><div className="featured-cell">{isFeatured(p)?<span className="featured-on">★ {p.featured_rank}순위</span>:<span className="featured-off">일반</span>}<form action={setFeaturedRank} className="featured-form"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="featured" value="on"/><input type="number" name="featured_rank" min={1} max={FEATURED_MAX_RANK} step={1} inputMode="numeric" defaultValue={isFeatured(p)?String(p.featured_rank):""} placeholder="순위" aria-label={`${p.name} 추천 우선순위`}/><button className="act-btn">{isFeatured(p)?"변경":"추천"}</button>{isFeatured(p)&&<button className="act-btn danger" name="featured_clear" value="1">해제</button>}</form></div></td><td className="col-center"><div className="table-actions admin-row-actions"><Link className="act-btn" href={`/admin/products/${p.id}${back?`?back=${encodeURIComponent(back)}`:""}`}>수정</Link><form action={toggleProduct}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="active" value={String(p.active)}/><button className="act-btn">{p.active?"판매중지":"판매공개"}</button></form><form action={toggleSoldOut}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="sold_out" value={String(Boolean(p.sold_out))}/><button className={`act-btn${p.sold_out?"":" danger"}`}>{p.sold_out?"품절 해제":"품절 처리"}</button></form><form action={moveProductsToTrash}><input type="hidden" name="ids" value={p.id}/><input type="hidden" name="back" value={back}/><ConfirmButton className="act-btn danger" message={`"${p.name}" 상품을 휴지통으로 옮길까요?\n고객 화면에서 바로 사라지며, 휴지통에서 복구할 수 있습니다.`}>삭제</ConfirmButton></form></div></td></tr>)}</tbody></table>{products.length===0&&<div className="empty">{q?"검색 결과가 없습니다.":"등록된 상품이 없습니다. 오른쪽 위에서 첫 상품을 등록하세요."}</div>}</div><AdminPager page={page} total={total} href={href} label={q?"검색 결과":"전체"}/>
 <p className="small-muted">삭제한 상품은 휴지통으로 옮겨지며 고객 화면에서 바로 사라집니다. 휴지통에서 복구하거나 영구 삭제할 수 있습니다. 주문은 무통장입금으로 접수되며, 주문 시 재고가 줄고 주문 취소 시 돌아옵니다.</p></div>}
