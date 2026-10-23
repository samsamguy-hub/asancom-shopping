"use client";
import { useActionState, useState } from "react";
import { submitAs, type AsFormState } from "@/app/as/actions";
import { CONTACT_TIMES } from "@/lib/estimate-rules";
import { AS_PRODUCT_TYPES, AS_PURCHASE_PLACES, AS_RECEIPT_METHODS, AS_SYMPTOMS } from "@/lib/as-rules";
export default function AsForm(){
 const [state,action,pending]=useActionState<AsFormState,FormData>(submitAs,null);
 const [time,setTime]=useState(CONTACT_TIMES[0]);const [method,setMethod]=useState<string>(AS_RECEIPT_METHODS[0]);
 if(state?.ok)return <div className="compat good estimate-done" role="status"><strong>{state.message}</strong>{state.no?<p>접수번호 <b>A/S-{state.no}</b> — 문의하실 때 접수번호를 말씀해 주세요.</p>:null}</div>;
 return <form action={action} className="estimate-form as-form">
  <label className="hp" aria-hidden="true">웹사이트<input name="website" tabIndex={-1} autoComplete="off"/></label>
  <h2>신청자 정보</h2>
  <div className="form-grid">
   <label>이름 *<input name="name" required minLength={2} maxLength={20} autoComplete="name" placeholder="홍길동"/></label>
   <label>전화번호 *<input name="phone" required type="tel" inputMode="tel" maxLength={13} autoComplete="tel" placeholder="010-1234-5678"/></label>
   <label>상담 가능 시간 *<select name="contact_time" value={time} onChange={e=>setTime(e.target.value)}>{[...CONTACT_TIMES,"직접 입력"].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
   {time==="직접 입력"&&<label>상담 가능 시간 직접 입력 *<input name="contact_time_other" required maxLength={60} placeholder="예) 평일 오후 3시 이후"/></label>}
  </div>
  <h2>제품·증상</h2>
  <div className="form-grid">
   <label>제품 종류 *<select name="product_type" required defaultValue="">{<option value="" disabled>선택하세요</option>}{AS_PRODUCT_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
   <label>구매처 *<select name="purchase_place" required defaultValue="">{<option value="" disabled>선택하세요</option>}{AS_PURCHASE_PLACES.map(t=><option key={t}>{t}</option>)}</select></label>
   <label>구매 시기 (선택)<input name="purchase_date" maxLength={30} placeholder="예) 2024년 3월, 약 2년 전"/></label>
   <label>증상 종류 *<select name="symptom_type" required defaultValue="">{<option value="" disabled>선택하세요</option>}{AS_SYMPTOMS.map(t=><option key={t}>{t}</option>)}</select></label>
  </div>
  <label>증상 자세히 *<textarea name="symptom" required minLength={5} maxLength={2000} rows={5} placeholder="언제부터, 어떤 상황에서 문제가 생기는지 적어 주세요. 예) 전원 버튼을 누르면 팬만 돌고 화면이 안 나옵니다. 어제 정전 후부터 그렇습니다."/></label>
  <fieldset className="as-methods"><legend>접수 방법 *</legend>{AS_RECEIPT_METHODS.map(m=><label key={m} className={`shipping-option${method===m?" selected":""}`}><input type="radio" name="receipt_method" value={m} checked={method===m} onChange={()=>setMethod(m)}/><span><strong>{m}</strong><small>{m==="매장 방문"?"아산시 온천대로 1408 (온양고 앞) 매장으로 가져오기":m==="택배 발송"?"접수 후 안내하는 주소로 택배 발송":"기사님이 방문 (출장비 별도, 지역에 따라 가능 여부 다름)"}</small></span></label>)}</fieldset>
  {method==="출장 방문 요청"&&<label>출장 방문 주소 *<input name="visit_address" required minLength={2} maxLength={120} autoComplete="street-address" placeholder="예) 아산시 온천동 ○○아파트 (상세 주소는 통화 시 확인)"/></label>}
  <div className="consent-box"><strong>확인 및 동의 (필수)</strong>
   <label className="check"><input type="checkbox" name="backup" required/> 중요한 자료는 미리 백업해야 하며, 점검·수리 중 자료가 지워질 수 있음을 확인했습니다.</label>
   <ul><li>개인정보 수집 항목: 이름, 전화번호, 상담 가능 시간, 제품·증상 정보, (출장 시) 방문 주소</li><li>목적: A/S 접수·상담 연락·수리 진행</li><li>보유 기간: A/S 처리 완료 후 1년 또는 삭제 요청 시까지</li><li>동의하지 않을 수 있으며, 이 경우 전화(041-542-3342)나 매장 방문으로 접수할 수 있습니다.</li></ul>
   <label className="check"><input type="checkbox" name="agree" required/> 개인정보 수집·이용에 동의합니다. (<a className="text-link" href="/policy/privacy" target="_blank">개인정보처리방침</a>)</label></div>
  {state&&!state.ok&&<p className="compat bad" role="alert">{state.message}</p>}
  <button className="btn primary" type="submit" disabled={pending}>{pending?"신청 중...":"A/S 신청하기"}</button>
 </form>;
}
