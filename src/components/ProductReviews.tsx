import ReviewForm from "@/components/ReviewForm";
import type { ReviewSummary } from "@/lib/reviews";
export const stars=(n:number)=>"★".repeat(Math.round(n))+"☆".repeat(5-Math.round(n));
const date=(s:string)=>new Date(s).toLocaleDateString("ko-KR");
// 상세페이지 리뷰 영역: 승인된 리뷰 목록 + 작성 폼
export default function ProductReviews({productId,summary,canWrite}:{productId:string,summary:ReviewSummary,canWrite:boolean}){
 return <section className="detail-section reviews" id="reviews"><h2>상품 리뷰 {summary.count>0&&<span className="review-score"><span aria-hidden="true">{stars(summary.average)}</span> {summary.average.toFixed(1)} ({summary.count}개)</span>}</h2>
  {!summary.available?<p className="compat neutral">리뷰 기능 준비 중입니다.</p>:<>
  {summary.reviews.length?<ul className="review-list">{summary.reviews.map(r=><li key={r.id}><div className="review-head"><span className="review-stars" aria-label={`${r.rating}점`}>{stars(r.rating)}</span><strong>{r.nickname}</strong>{r.verified_purchase&&<span className="tiny-badge">구매 확인</span>}<small>{date(r.created_at)}</small></div><p className="review-body">{r.content}</p>{r.admin_reply&&<div className="review-reply"><strong>아산컴마트 답변</strong>{r.replied_at&&<small> {date(r.replied_at)}</small>}<p>{r.admin_reply}</p></div>}</li>)}</ul>:<p className="muted">아직 리뷰가 없습니다. 첫 리뷰를 남겨 주세요.</p>}
  {summary.count>summary.reviews.length&&<p className="small-muted">최근 리뷰 {summary.reviews.length}개를 표시했습니다.</p>}
  {canWrite?<details className="review-write"><summary>리뷰 작성하기</summary><ReviewForm productId={productId}/></details>:<p className="small-muted">DB 연결 후 리뷰를 작성할 수 있습니다.</p>}
  <p className="small-muted">‘구매 확인’은 매장에서 구매 내역을 확인한 리뷰입니다. 리뷰는 관리자 확인 후 게시되며, 판매자는 리뷰 내용을 수정할 수 없습니다.</p></>}
 </section>;
}
