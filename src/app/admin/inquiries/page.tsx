import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { deleteInquiry, saveInquiryMemo, setInquiryStatus } from "@/app/admin/inquiry-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { INQUIRY_STATUS, INQUIRY_TYPES, isInquiryType, type BusinessInquiry, type InquiryStatus } from "@/lib/inquiry-rules";
export const dynamic="force-dynamic";
// 진행중 = 접수·상담중
const OPEN:InquiryStatus[]=["received","consulting"];
const tabs=[["open","진행중"],...Object.entries(INQUIRY_STATUS),["all","전체"]] as [string,string][];
export default async function InquiriesAdmin({searchParams}:{searchParams:Promise<{status?:string,type?:string,error?:string,saved?:string}>}){
 const db=await requireAdmin();const sp=await searchParams;
 const tab=tabs.some(([k])=>k===sp.status)?sp.status!:"open";const kind=sp.type&&isInquiryType(sp.type)?sp.type:"all";
 let q=db.from("business_inquiries").select("*").order("inquiry_no",{ascending:false}).limit(200);
 q=tab==="all"?q:tab==="open"?q.in("status",OPEN):q.eq("status",tab);
 if(kind!=="all")q=q.eq("inquiry_type",kind);
 const {data,error}=await q;const rows=(data||[]) as BusinessInquiry[];
 const link=(s:string,t:string)=>`/admin/inquiries?status=${s}&type=${t}`;
 const hidden=(r:BusinessInquiry)=><><input type="hidden" name="id" value={r.id}/><input type="hidden" name="tab" value={tab}/><input type="hidden" name="kind_tab" value={kind}/></>;
 return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><h1>홈페이지·앱·창업 문의</h1><p>고객이 사이트 맨 아래 문의 메뉴에서 신청한 내용입니다. 연락처는 관리자 화면에서만 보입니다.</p>
 {error?<p className="compat bad">문의 테이블이 없습니다. Supabase SQL Editor에서 supabase/business_inquiries.sql을 먼저 실행하세요.</p>:<>
 {sp.error&&<p className="compat bad" role="alert">처리하지 못했습니다. 다시 시도하세요.</p>}{sp.saved&&!sp.error&&<p className="compat good" role="status">처리되었습니다.</p>}
 <div className="filter-pills"><Link className={kind==="all"?"active":""} href={link(tab,"all")}>전체 종류</Link>{Object.entries(INQUIRY_TYPES).map(([k,v])=><Link key={k} className={k===kind?"active":""} href={link(tab,k)}>{v.icon} {v.short}</Link>)}</div>
 <div className="filter-pills" style={{marginTop:10}}>{tabs.map(([k,l])=><Link key={k} className={k===tab?"active":""} href={link(k,kind)}>{l}</Link>)}</div>
 {rows.length?<ul className="review-admin estimate-admin">{rows.map(r=><li key={r.id}>
  <div className="review-head"><strong>문의-{r.inquiry_no} · {INQUIRY_TYPES[r.inquiry_type]?.short||r.inquiry_type} · {r.kind}</strong><span className={`status-chip as-${r.status==="consulting"?"checking":r.status==="done"?"done":r.status}`}>{INQUIRY_STATUS[r.status]}</span><small>{new Date(r.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</small></div>
  <div className="estimate-contact"><span>이름 <strong>{r.customer_name}</strong></span>{r.company&&<span>상호 <strong>{r.company}</strong></span>}<span>전화 <a className="text-link" href={`tel:${r.phone.replace(/-/g,"")}`}>{r.phone}</a></span>{r.email&&<span>이메일 {r.email}</span>}<span>상담 가능 <strong>{r.contact_time}</strong></span></div>
  <p className="small-muted">예산: {r.budget} · 희망 일정: {r.schedule}</p>
  <p className="review-body">{r.content}</p>
  <div className="table-actions">{(Object.keys(INQUIRY_STATUS) as InquiryStatus[]).filter(s=>s!==r.status).map(s=><form key={s} action={setInquiryStatus}>{hidden(r)}<input type="hidden" name="status" value={s}/><button className={s==="canceled"?"link-button":"btn secondary small"}>{INQUIRY_STATUS[s]}</button></form>)}
   <form action={deleteInquiry}>{hidden(r)}<ConfirmButton className="link-button danger" message={`문의-${r.inquiry_no}을 삭제할까요?\n고객 연락처도 함께 삭제되며 되돌릴 수 없습니다.`}>삭제</ConfirmButton></form></div>
  <form action={saveInquiryMemo} className="reply-form">{hidden(r)}<label>관리자 메모 (고객에게 보이지 않음)<textarea name="memo" maxLength={2000} rows={2} defaultValue={r.admin_memo||""} placeholder="상담 내용, 안내한 견적, 다음 연락 날짜 등"/></label><button className="btn secondary small">메모 저장</button></form>
 </li>)}</ul>:<div className="empty">해당 조건의 문의가 없습니다.</div>}
 <p className="small-muted">개인정보 보유 기간(상담 완료 후 1년)이 지난 문의나 고객이 삭제를 요청한 문의는 삭제해 주세요.</p></>}
 </div>;
}
