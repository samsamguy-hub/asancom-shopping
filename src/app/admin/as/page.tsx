import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { deleteAs, saveAsMemo, setAsStatus } from "@/app/admin/as-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { AS_STATUS, type AsRequest, type AsStatus } from "@/lib/as-rules";
export const dynamic="force-dynamic";
// 진행중 = 접수·점검중·수리중·수리완료 (출고완료·취소 제외)
const OPEN:AsStatus[]=["received","checking","repairing","done"];
const tabs=[["open","진행중"],...Object.entries(AS_STATUS),["all","전체"]] as [string,string][];
export default async function AsAdmin({searchParams}:{searchParams:Promise<{status?:string,error?:string,saved?:string}>}){
 const db=await requireAdmin();const sp=await searchParams;
 const tab=tabs.some(([k])=>k===sp.status)?sp.status!:"open";
 let q=db.from("as_requests").select("*").order("request_no",{ascending:false}).limit(200);
 q=tab==="all"?q:tab==="open"?q.in("status",OPEN):q.eq("status",tab);
 const {data,error}=await q;const rows=(data||[]) as AsRequest[];
 const hidden=(r:AsRequest)=><><input type="hidden" name="id" value={r.id}/><input type="hidden" name="tab" value={tab}/></>;
 return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><h1>A/S 접수 관리</h1><p>고객이 <Link className="text-link" href="/as" target="_blank">A/S 신청</Link>에서 접수한 내용입니다. 연락처·주소는 관리자 화면에서만 보입니다. 진행에 맞춰 상태를 바꿔 주세요.</p>
 {error?<p className="compat bad">A/S 테이블이 없습니다. Supabase SQL Editor에서 supabase/as_requests.sql을 먼저 실행하세요.</p>:<>
 {sp.error&&<p className="compat bad" role="alert">처리하지 못했습니다. 다시 시도하세요.</p>}{sp.saved&&!sp.error&&<p className="compat good" role="status">처리되었습니다.</p>}
 <div className="filter-pills">{tabs.map(([k,l])=><Link key={k} className={k===tab?"active":""} href={`/admin/as?status=${k}`}>{l}</Link>)}</div>
 {rows.length?<ul className="review-admin estimate-admin">{rows.map(r=><li key={r.id}>
  <div className="review-head"><strong>A/S-{r.request_no} · {r.product_type} · {r.symptom_type}</strong><span className={`status-chip as-${r.status}`}>{AS_STATUS[r.status]}</span><small>{new Date(r.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</small></div>
  <div className="estimate-contact"><span>이름 <strong>{r.customer_name}</strong></span><span>전화 <a className="text-link" href={`tel:${r.phone.replace(/-/g,"")}`}>{r.phone}</a></span><span>상담 가능 <strong>{r.contact_time}</strong></span><span>접수 방법 <strong>{r.receipt_method}</strong></span></div>
  {r.visit_address&&<p className="small-muted">출장 주소: {r.visit_address}</p>}
  <p className="small-muted">구매처: {r.purchase_place}{r.purchase_date&&` · 구매 시기: ${r.purchase_date}`}</p>
  <p className="review-body">{r.symptom}</p>
  <div className="table-actions">{(Object.keys(AS_STATUS) as AsStatus[]).filter(s=>s!==r.status).map(s=><form key={s} action={setAsStatus}>{hidden(r)}<input type="hidden" name="status" value={s}/><button className={s==="canceled"?"link-button":"btn secondary small"}>{AS_STATUS[s]}</button></form>)}
   <form action={deleteAs}>{hidden(r)}<ConfirmButton className="link-button danger" message={`A/S-${r.request_no} 접수를 삭제할까요?\n고객 연락처도 함께 삭제되며 되돌릴 수 없습니다.`}>삭제</ConfirmButton></form></div>
  <form action={saveAsMemo} className="reply-form">{hidden(r)}<label>관리자 메모 (고객에게 보이지 않음)<textarea name="memo" maxLength={2000} rows={2} defaultValue={r.admin_memo||""} placeholder="점검 결과, 안내한 수리비, 부품 주문 상황 등"/></label><button className="btn secondary small">메모 저장</button></form>
 </li>)}</ul>:<div className="empty">해당 상태의 A/S 접수가 없습니다.</div>}
 <p className="small-muted">개인정보 보유 기간(처리 완료 후 1년)이 지난 접수나 고객이 삭제를 요청한 접수는 삭제해 주세요.</p></>}
 </div>;
}
