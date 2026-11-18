import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { deleteReview, saveReviewReply, setReviewStatus, toggleVerifiedPurchase } from "@/app/admin/review-actions";
import ConfirmButton from "@/components/ConfirmButton";
import AdminPager from "@/components/AdminPager";
import { keepPageInRange, pageRange, parsePage } from "@/lib/admin-paging";
import { stars } from "@/components/ProductReviews";
import type { Review } from "@/lib/reviews";
export const dynamic="force-dynamic";
const tabs=[{key:"pending",label:"검토 대기"},{key:"approved",label:"게시 중"},{key:"hidden",label:"숨김"}] as const;
type Row=Review&{products:{name:string,slug:string}|null};
export default async function ReviewAdmin({searchParams}:{searchParams:Promise<{status?:string,error?:string,saved?:string,page?:string}>}){
 const db=await requireAdmin();const sp=await searchParams;
 const tab=tabs.find(t=>t.key===sp.status)?.key||"pending";
 // 관리자는 모든 상태의 리뷰 조회 (RLS: is_admin)
 // 10개씩: 최신 작성순(같은 시각이면 id 순) 현재 페이지만 조회 + 전체 개수. 탭을 바꾸면 1페이지
 const page=parsePage(sp.page),{from,to}=pageRange(page),href=(p:number)=>`/admin/reviews?status=${tab}${p>1?`&page=${p}`:""}`;
 const {data,error,count}=await db.from("product_reviews").select("*,products(name,slug)",{count:"exact"}).eq("status",tab).order("created_at",{ascending:false}).order("id",{ascending:false}).range(from,to);
 await keepPageInRange(page,count,error?.code,href,()=>db.from("product_reviews").select("id",{count:"exact",head:true}).eq("status",tab));const total=count||0;
 const rows=(data||[]) as unknown as Row[];
 const hidden=(r:Row)=><><input type="hidden" name="id" value={r.id}/><input type="hidden" name="tab" value={tab}/><input type="hidden" name="page" value={page}/></>;
 return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><h1>리뷰 관리</h1><p>고객이 작성한 리뷰는 &lsquo;검토 대기&rsquo;로 들어오며, 승인해야 상품 상세페이지에 게시됩니다. 리뷰 본문은 수정할 수 없습니다(리뷰 조작 방지). 부적절한 리뷰는 숨기거나 삭제하세요.</p>
 {error?<p className="compat bad">리뷰 테이블이 없습니다. Supabase SQL Editor에서 supabase/product_reviews.sql을 먼저 실행하세요.</p>:<>
 {sp.error&&<p className="compat bad" role="alert">처리하지 못했습니다. 다시 시도하세요.</p>}{sp.saved&&!sp.error&&<p className="compat good">처리되었습니다.</p>}
 <div className="filter-pills">{tabs.map(t=><Link key={t.key} className={t.key===tab?"active":""} href={`/admin/reviews?status=${t.key}`}>{t.label}</Link>)}</div>
 {rows.length?<ul className="review-admin">{rows.map(r=><li key={r.id}>
  <div className="review-head"><span className="review-stars">{stars(r.rating)}</span><strong>{r.nickname}</strong>{r.verified_purchase&&<span className="tiny-badge">구매 확인</span>}<small>{new Date(r.created_at).toLocaleString("ko-KR")}</small></div>
  <p className="small-muted">상품: {r.products?<Link className="text-link" href={`/products/${encodeURIComponent(r.products.slug)}#reviews`}>{r.products.name}</Link>:"(삭제된 상품)"}</p>
  <p className="review-body">{r.content}</p>
  <div className="table-actions">
   {tab!=="approved"&&<form action={setReviewStatus}>{hidden(r)}<input type="hidden" name="status" value="approved"/><button className="btn primary small">승인·게시</button></form>}
   {tab!=="hidden"&&<form action={setReviewStatus}>{hidden(r)}<input type="hidden" name="status" value="hidden"/><button className="btn secondary small">숨김</button></form>}
   <form action={toggleVerifiedPurchase}>{hidden(r)}<input type="hidden" name="verified" value={String(r.verified_purchase)}/><button className="link-button">{r.verified_purchase?"구매 확인 해제":"구매 확인 표시"}</button></form>
   <form action={deleteReview}>{hidden(r)}<ConfirmButton className="link-button danger" message="이 리뷰를 삭제할까요? 되돌릴 수 없습니다.">삭제</ConfirmButton></form>
  </div>
  <form action={saveReviewReply} className="reply-form">{hidden(r)}<label>판매자 답글 (비우고 저장하면 삭제)<textarea name="reply" maxLength={1000} rows={2} defaultValue={r.admin_reply||""}/></label><button className="btn secondary small">답글 저장</button></form>
 </li>)}</ul>:<div className="empty">{tabs.find(t=>t.key===tab)?.label} 리뷰가 없습니다.</div>}<AdminPager page={page} total={total} href={href}/>
 <p className="small-muted">‘구매 확인’은 매장 판매 기록으로 실제 구매를 확인한 경우에만 표시하세요.</p></>}
 </div>}
