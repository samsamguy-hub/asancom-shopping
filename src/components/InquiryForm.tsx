"use client";
import { useActionState, useState } from "react";
import { submitInquiry, type InquiryFormState } from "@/app/inquiry/actions";
import { CONTACT_TIMES } from "@/lib/estimate-rules";
import { INQUIRY_SCHEDULES, INQUIRY_TYPES, inquiryBudgets, type InquiryType } from "@/lib/inquiry-rules";
// 홈페이지 제작·앱 개발·창업 문의 신청서 (A/S 신청서와 같은 구성)
export default function InquiryForm({type}:{type:InquiryType}){
 const info=INQUIRY_TYPES[type];
 const [state,action,pending]=useActionState<InquiryFormState,FormData>(submitInquiry,null);
 const [time,setTime]=useState(CONTACT_TIMES[0]);
 if(state?.ok)return <div className="compat good estimate-done" role="status"><strong>{state.message}</strong>{state.no?<p>접수번호 <b>문의-{state.no}</b> — 문의하실 때 접수번호를 말씀해 주세요.</p>:null}</div>;
 return <form action={action} className="estimate-form as-form">
  <input type="hidden" name="type" value={type}/>
  <label className="hp" aria-hidden="true">웹사이트<input name="website" tabIndex={-1} autoComplete="off"/></label>
  <h2>신청자 정보</h2>
  <div className="form-grid">
   <label>이름 *<input name="name" required minLength={2} maxLength={20} autoComplete="name" placeholder="홍길동"/></label>
   <label>회사·상호명 (선택)<input name="company" maxLength={40} autoComplete="organization" placeholder="예) ○○컴퓨터"/></label>
   <label>전화번호 *<input name="phone" required type="tel" inputMode="tel" maxLength={13} autoComplete="tel" placeholder="010-1234-5678"/></label>
   <label>이메일 (선택)<input name="email" type="email" maxLength={120} autoComplete="email" placeholder="자료를 받을 이메일"/></label>
   <label>상담 가능 시간 *<select name="contact_time" value={time} onChange={e=>setTime(e.target.value)}>{[...CONTACT_TIMES,"직접 입력"].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
   {time==="직접 입력"&&<label>상담 가능 시간 직접 입력 *<input name="contact_time_other" required maxLength={60} placeholder="예) 평일 오후 3시 이후"/></label>}
  </div>
  <h2>문의 내용</h2>
  <div className="form-grid">
   <label>구분 *<select name="kind" required defaultValue={info.kinds.length===1?info.kinds[0]:""}>{info.kinds.length>1&&<option value="" disabled>선택하세요</option>}{info.kinds.map(t=><option key={t}>{t}</option>)}</select></label>
   <label>예산 *<select name="budget" required defaultValue="">{<option value="" disabled>선택하세요</option>}{inquiryBudgets(type).map(t=><option key={t}>{t}</option>)}</select></label>
   <label>희망 일정 *<select name="schedule" required defaultValue="">{<option value="" disabled>선택하세요</option>}{INQUIRY_SCHEDULES.map(t=><option key={t}>{t}</option>)}</select></label>
  </div>
  <label>자세한 내용 *<textarea name="content" required minLength={10} maxLength={3000} rows={6} placeholder={info.placeholder}/></label>
  <div className="consent-box"><strong>개인정보 수집·이용 동의 (필수)</strong>
   <ul><li>수집 항목: 이름, 전화번호, 상담 가능 시간, 문의 내용, (선택) 회사·상호명, 이메일</li><li>목적: {info.short} 문의 접수·상담 연락·견적 안내</li><li>보유 기간: 상담 완료 후 1년 또는 삭제 요청 시까지</li><li>동의하지 않을 수 있으며, 이 경우 전화(041-542-3342)로 문의할 수 있습니다.</li></ul>
   <label className="check"><input type="checkbox" name="agree" required/> 개인정보 수집·이용에 동의합니다. (<a className="text-link" href="/policy/privacy" target="_blank">개인정보처리방침</a>)</label></div>
  {state&&!state.ok&&<p className="compat bad" role="alert">{state.message}</p>}
  <button className="btn primary" type="submit" disabled={pending}>{pending?"신청 중...":`${info.label} 신청하기`}</button>
 </form>;
}
