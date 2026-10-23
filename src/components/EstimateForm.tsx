"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitEstimate, type EstimateFormState } from "@/app/estimate/actions";
import { CONTACT_TIMES, ESTIMATE_CATEGORIES, type EstimateCategory } from "@/lib/estimate-rules";
const icons:Record<EstimateCategory,string>={"CPU":"▣","메인보드":"▦","메모리":"▥","그래픽카드":"◈","SSD":"▤","파워":"⚡","케이스":"▧","CPU쿨러":"❄","O/S":"⊞","조립선택":"⚙"};
export default function EstimateForm({byCategory}:{byCategory:Record<EstimateCategory,string[]>}){
 const [state,action,pending]=useActionState<EstimateFormState,FormData>(submitEstimate,null);
 const [time,setTime]=useState(CONTACT_TIMES[0]);
 if(state?.ok)return <div className="compat good estimate-done" role="status"><strong>{state.message}</strong>{state.no?<p>견적게시판 {state.no}번 글로 등록되었습니다. 게시판에는 이름 첫 글자와 선택한 부품만 보이며 전화번호는 공개되지 않습니다.</p>:null}<div className="detail-actions">{state.no?<Link className="btn primary" href={`/estimate/board/${state.no}`}>내 견적 글 보기</Link>:null}<Link className="btn secondary" href="/estimate/board">견적게시판</Link></div></div>;
 return <form action={action} className="estimate-form">
  <label className="hp" aria-hidden="true">웹사이트<input name="website" tabIndex={-1} autoComplete="off"/></label>
  <div className="estimate-parts">{ESTIMATE_CATEGORIES.map(c=>{const list=byCategory[c];return <label key={c} className="estimate-row"><span className="estimate-cat"><i aria-hidden="true">{icons[c]}</i>{c}</span>
   <select name={`part:${c}`} defaultValue="" disabled={!list.length}><option value="">{list.length?"선택 안 함":"등록된 항목 없음"}</option>{list.map(n=><option key={n} value={n}>{n}</option>)}</select></label>;})}</div>
  <p className="small-muted">원하는 부품이 목록에 없거나 잘 모르겠으면 &lsquo;선택 안 함&rsquo;으로 두고 아래 요청사항에 용도·예산을 적어 주세요.</p>
  <h2>상담 받을 연락처</h2>
  <div className="form-grid">
   <label>이름 *<input name="name" required minLength={2} maxLength={20} autoComplete="name" placeholder="홍길동"/></label>
   <label>전화번호 *<input name="phone" required type="tel" inputMode="tel" maxLength={13} autoComplete="tel" placeholder="010-1234-5678"/></label>
   <label>상담 가능 시간 *<select name="contact_time" value={time} onChange={e=>setTime(e.target.value)}>{[...CONTACT_TIMES,"직접 입력"].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
   {time==="직접 입력"&&<label>상담 가능 시간 직접 입력 *<input name="contact_time_other" required maxLength={60} placeholder="예) 평일 오후 3시 이후"/></label>}
  </div>
  <label>요청사항 (선택)<textarea name="message" maxLength={1000} rows={4} placeholder="용도(게임·사무·영상편집), 예산, 원하는 게임이나 프로그램 등을 적어 주세요."/></label>
  <div className="consent-box"><strong>개인정보 수집·이용 동의 (필수)</strong><ul>
   <li>수집 항목: 이름, 전화번호, 상담 가능 시간, 요청사항</li>
   <li>목적: 조립PC 견적 상담 연락</li>
   <li>보유 기간: 상담 완료 후 1년 또는 삭제 요청 시까지</li>
   <li>동의하지 않을 수 있으며, 이 경우 온라인 신청 대신 전화(041-542-3342)로 상담받을 수 있습니다.</li>
  </ul><label className="check"><input type="checkbox" name="agree" required/> 위 내용에 동의합니다. (<a className="text-link" href="/policy/privacy" target="_blank">개인정보처리방침</a>)</label></div>
  {state&&!state.ok&&<p className="compat bad" role="alert">{state.message}</p>}
  <button className="btn primary" type="submit" disabled={pending}>{pending?"신청 중...":"견적 상담 신청"}</button>
 </form>;
}
