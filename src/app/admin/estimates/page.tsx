import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { deleteEstimate, saveEstimateMemo, setEstimateStatus } from "@/app/admin/estimate-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { ESTIMATE_CATEGORIES, ESTIMATE_STATUS, postTitle, type EstimateContact, type EstimatePost, type EstimateStatus } from "@/lib/estimate-rules";
export const dynamic="force-dynamic";
type Row=EstimatePost&{estimate_contacts:EstimateContact|EstimateContact[]|null};
const tabs=[["all","전체"],...Object.entries(ESTIMATE_STATUS)] as [string,string][];
export default async function EstimatesAdmin({searchParams}:{searchParams:Promise<{status?:string,error?:string,saved?:string}>}){
 const db=await requireAdmin();const sp=await searchParams;
 const tab=tabs.some(([k])=>k===sp.status)?sp.status!:"all";
 // 관리자만 연락처(estimate_contacts)까지 조회 가능 (RLS: is_admin)
 let q=db.from("estimate_requests").select("id,request_no,parts,display_name,status,created_at,estimate_contacts(request_id,customer_name,phone,contact_time,message,admin_memo)").order("request_no",{ascending:false}).limit(200);
 q=tab==="all"?q.neq("status","hidden"):q.eq("status",tab);
 const {data,error}=await q;const rows=(data||[]) as unknown as Row[];
 const hidden=(r:Row)=><><input type="hidden" name="id" value={r.id}/><input type="hidden" name="tab" value={tab}/></>;
 return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><h1>견적 상담 문의</h1><p>고객이 <Link className="text-link" href="/estimate/board" target="_blank">견적게시판</Link>에 올린 상담 신청입니다. 이름·전화번호·요청사항은 관리자 화면에서만 보입니다. 상담 후 상태를 바꿔 주세요.</p>
 {error?<p className="compat bad">견적 테이블이 없습니다. Supabase SQL Editor에서 supabase/estimates.sql을 먼저 실행하세요.</p>:<>
 {sp.error&&<p className="compat bad" role="alert">처리하지 못했습니다. 다시 시도하세요.</p>}{sp.saved&&!sp.error&&<p className="compat good" role="status">처리되었습니다.</p>}
 <div className="filter-pills">{tabs.map(([k,l])=><Link key={k} className={k===tab?"active":""} href={`/admin/estimates?status=${k}`}>{l}</Link>)}</div>
 {rows.length?<ul className="review-admin estimate-admin">{rows.map(r=>{const c=Array.isArray(r.estimate_contacts)?r.estimate_contacts[0]:r.estimate_contacts;return <li key={r.id}>
  <div className="review-head"><strong>#{r.request_no} {postTitle(r.parts)}</strong><span className={`status-chip status-${r.status}`}>{ESTIMATE_STATUS[r.status]}</span><small>{new Date(r.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</small></div>
  {c?<div className="estimate-contact"><span>이름 <strong>{c.customer_name}</strong></span><span>전화 <a className="text-link" href={`tel:${c.phone.replace(/-/g,"")}`}>{c.phone}</a></span><span>상담 가능 <strong>{c.contact_time}</strong></span></div>:<p className="small-muted">연락처 정보 없음</p>}
  {c?.message&&<p className="review-body">{c.message}</p>}
  <table className="info-table compact"><tbody>{ESTIMATE_CATEGORIES.filter(k=>r.parts[k]).map(k=><tr key={k}><th>{k}</th><td>{r.parts[k]}</td></tr>)}</tbody></table>
  <div className="table-actions">{(Object.keys(ESTIMATE_STATUS) as EstimateStatus[]).filter(s=>s!==r.status).map(s=><form key={s} action={setEstimateStatus}>{hidden(r)}<input type="hidden" name="status" value={s}/><button className={s==="hidden"?"link-button":"btn secondary small"}>{s==="hidden"?"게시판에서 숨김":`${ESTIMATE_STATUS[s]}(으)로`}</button></form>)}
   <form action={deleteEstimate}>{hidden(r)}<ConfirmButton className="link-button danger" message={`#${r.request_no} 견적 문의를 삭제할까요?\n고객 연락처도 함께 삭제되며 되돌릴 수 없습니다.`}>삭제</ConfirmButton></form></div>
  {c&&<form action={saveEstimateMemo} className="reply-form">{hidden(r)}<label>관리자 메모 (고객에게 보이지 않음)<textarea name="memo" maxLength={1000} rows={2} defaultValue={c.admin_memo||""} placeholder="상담 내용, 안내한 금액 등"/></label><button className="btn secondary small">메모 저장</button></form>}
 </li>;})}</ul>:<div className="empty">해당 상태의 견적 문의가 없습니다.</div>}
 <p className="small-muted">개인정보 보유 기간(상담 완료 후 1년)이 지난 문의나 고객이 삭제를 요청한 문의는 삭제해 주세요.</p></>}
 </div>;
}
