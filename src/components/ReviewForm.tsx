"use client";
import { useActionState, useState } from "react";
import { submitReview, type ReviewFormState } from "@/app/products/review-actions";
export default function ReviewForm({productId}:{productId:string}){
 const [state,action,pending]=useActionState<ReviewFormState,FormData>(submitReview,null);
 const [rating,setRating]=useState(0);
 if(state?.ok)return <p className="compat good" role="status">{state.message}</p>;
 return <form action={action} className="review-form"><input type="hidden" name="product_id" value={productId}/>
  {/* 자동 등록 방지용 숨김 칸 (사람에게는 보이지 않음) */}
  <label className="hp" aria-hidden="true">웹사이트<input name="website" tabIndex={-1} autoComplete="off"/></label>
  <fieldset className="star-input"><legend>별점</legend>{[1,2,3,4,5].map(n=><label key={n} title={`${n}점`}><input type="radio" name="rating" value={n} required checked={rating===n} onChange={()=>setRating(n)}/><span aria-hidden="true">{n<=rating?"★":"☆"}</span><span className="sr-only">{n}점</span></label>)}</fieldset>
  <label>닉네임<input name="nickname" required minLength={2} maxLength={20} placeholder="2~20자 (실명·연락처는 쓰지 마세요)"/></label>
  <label>리뷰 내용<textarea name="content" required minLength={10} maxLength={1000} rows={4} placeholder="상품을 사용해 본 경험을 10자 이상 적어 주세요."/></label>
  <label className="check"><input type="checkbox" name="agree" required/> 작성한 리뷰는 관리자 확인 후 게시되며, 욕설·광고·개인정보가 포함되면 게시되지 않을 수 있습니다. 닉네임·별점·내용은 <a className="text-link" href="/policy/privacy" target="_blank">개인정보처리방침</a>에 따라 처리됩니다.</label>
  {state&&!state.ok&&<p className="compat bad" role="alert">{state.message}</p>}
  <button className="btn primary" type="submit" disabled={pending}>{pending?"등록 중...":"리뷰 등록"}</button></form>;
}
