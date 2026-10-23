import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import type { Product } from "@/lib/types";
import { formatKRW } from "@/lib/types";
import { moveProductsToTrash, toggleProduct, toggleSoldOut } from "@/app/admin/actions";
import { BULK_FORM_ID, BulkDeleteBar, SelectAllCheckbox } from "@/components/BulkDelete";
import ConfirmButton from "@/components/ConfirmButton";
import ProductBadges from "@/components/ProductBadges";
import { discountRate, isSoldOut } from "@/lib/product-status";
import LogoutButton from "@/components/LogoutButton";
export const dynamic="force-dynamic";
const deleteErrors:Record<string,string>={none:"상품을 선택하세요.",too_many:"한 번에 200개까지 처리할 수 있습니다.",sql:"휴지통 기능을 쓰려면 Supabase SQL Editor에서 supabase/product_trash.sql을 먼저 실행하세요.",db:"처리하지 못했습니다. 잠시 후 다시 시도하세요."};
export default async function AdminPage({searchParams}:{searchParams:Promise<{trashed?:string,delete_error?:string}>}){const db=await requireAdmin();const sp=await searchParams;const {data,error}=await db.from("products").select("*").order("created_at",{ascending:false});if(error)throw new Error(error.message);
 // 휴지통 상품은 목록에서 빼고 개수만 표시 (deleted_at 열이 아직 없으면 모두 일반 상품)
 const all=(data||[]) as Product[];const products=all.filter(p=>!p.deleted_at);const trashCount=all.length-products.length;
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
 return <div className="wide section"><div className="admin-heading"><div><span className="eyebrow blue">ADMIN DASHBOARD</span><h1>아산컴마트 상품 관리</h1><p>실제 등록한 상품·가격·재고를 수정합니다.</p></div><div className="admin-actions"><Link href="/admin/products/new" className="btn primary">+ 새 상품 등록</Link><Link href="/admin/orders" className="btn primary">주문 관리{pendingOrders>0&&<span className="cart-badge gray">{pendingOrders}</span>}</Link><Link href="/admin/products/import" className="btn secondary">CSV 일괄등록</Link><Link href="/admin/shipping" className="btn secondary">배송·설치비 관리</Link><Link href="/admin/as" className="btn secondary">A/S 접수{newAs>0&&<span className="cart-badge">{newAs}</span>}</Link><Link href="/admin/estimates" className="btn secondary">견적 문의{newEstimates>0&&<span className="cart-badge">{newEstimates}</span>}</Link><Link href="/admin/estimate-parts" className="btn secondary">견적 부품 관리</Link><Link href="/admin/inquiries" className="btn secondary">홈페이지·앱·창업 문의{newInquiries>0&&<span className="cart-badge">{newInquiries}</span>}</Link><Link href="/admin/reviews" className="btn secondary">리뷰 관리{pendingReviews>0&&<span className="cart-badge">{pendingReviews}</span>}</Link><Link href="/admin/trash" className="btn secondary">🗑 휴지통{trashCount>0&&<span className="cart-badge gray">{trashCount}</span>}</Link><LogoutButton/></div></div>
 <div className="stats"><div><span>총 등록</span><strong>{products.length}개</strong></div><div><span>판매 공개</span><strong>{products.filter(p=>p.active).length}개</strong></div><div><span>품절 (지정·재고 0)</span><strong>{products.filter(isSoldOut).length}개</strong></div></div>
 {sp.trashed&&<p className="compat good" role="status">상품 {Number(sp.trashed)||0}개를 휴지통으로 옮겼습니다. <Link className="text-link" href="/admin/trash">휴지통에서 복구하기 →</Link></p>}{sp.delete_error&&<p className="compat bad" role="alert">{deleteErrors[sp.delete_error]||deleteErrors.db}</p>}
 {products.length>0&&<BulkDeleteBar actions={[{action:moveProductsToTrash,label:"선택 삭제 (휴지통으로)",confirm:"선택한 상품 {count}개를 휴지통으로 옮길까요?\n고객 화면에서 바로 사라지며, 휴지통에서 복구할 수 있습니다.",danger:true}]}/>}
 <div className="table-wrap"><table className="admin-table"><thead><tr><th className="check-col"><SelectAllCheckbox/></th><th>상품명</th><th>분류</th><th>가격</th><th>재고</th><th>공개</th><th>품절</th><th>관리</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td className="check-col"><input type="checkbox" name="ids" value={p.id} form={BULK_FORM_ID} aria-label={`${p.name} 선택`}/></td><td>{p.name}<ProductBadges p={p} className="product-badges inline"/></td><td>{p.category}</td><td>{formatKRW(p.price)}{discountRate(p)>0&&<small className="admin-list-price">정상가 {formatKRW(p.list_price!)} · {discountRate(p)}% 할인</small>}</td><td>{p.stock}</td><td>{p.active?"공개":"비공개"}</td><td>{p.sold_out?<span className="sold-out-text">품절 지정</span>:p.stock<=0?<span className="sold-out-text">재고 0</span>:"판매 가능"}</td><td><div className="table-actions"><Link className="text-link" href={`/admin/products/${p.id}`}>수정</Link><form action={toggleProduct}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="active" value={String(p.active)}/><button className="link-button">{p.active?"판매중지":"판매공개"}</button></form><form action={toggleSoldOut}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="sold_out" value={String(Boolean(p.sold_out))}/><button className={`link-button${p.sold_out?"":" danger"}`}>{p.sold_out?"품절 해제":"품절 처리"}</button></form><form action={moveProductsToTrash}><input type="hidden" name="ids" value={p.id}/><ConfirmButton className="link-button danger" message={`"${p.name}" 상품을 휴지통으로 옮길까요?\n고객 화면에서 바로 사라지며, 휴지통에서 복구할 수 있습니다.`}>삭제</ConfirmButton></form></div></td></tr>)}</tbody></table>{products.length===0&&<div className="empty">등록된 상품이 없습니다. 오른쪽 위에서 첫 상품을 등록하세요.</div>}</div>
 <p className="small-muted">삭제한 상품은 휴지통으로 옮겨지며 고객 화면에서 바로 사라집니다. 휴지통에서 복구하거나 영구 삭제할 수 있습니다. 주문은 무통장입금으로 접수되며, 주문 시 재고가 줄고 주문 취소 시 돌아옵니다.</p></div>}
