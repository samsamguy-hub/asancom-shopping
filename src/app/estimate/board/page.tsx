import Link from "next/link";
import type { Metadata } from "next";
import { BOARD_PAGE_SIZE, ESTIMATE_STATUS, getBoard, postTitle } from "@/lib/estimates";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"견적게시판 | 아산컴마트"};
const date=(s:string)=>new Date(s).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"});
export default async function EstimateBoard({searchParams}:{searchParams:Promise<{page?:string}>}){
 const sp=await searchParams;const page=Math.max(1,Math.min(10000,Math.floor(Number(sp.page))||1));
 const {posts,total,available}=await getBoard(page);const pages=Math.max(1,Math.ceil(total/BOARD_PAGE_SIZE));
 return <div className="wide section narrow"><div className="section-heading"><div><span className="eyebrow blue">ESTIMATE BOARD</span><h1>견적게시판</h1><p className="muted">고객님들이 신청한 조립PC 견적 상담 목록입니다. 연락처는 공개되지 않습니다.</p></div><Link className="btn primary" href="/estimate">견적 상담 신청</Link></div>
 {!available?<div className="empty">견적게시판 준비 중입니다.</div>:posts.length?<div className="table-wrap"><table className="admin-table board-table"><thead><tr><th>번호</th><th>견적 내용</th><th>작성자</th><th>상태</th><th>날짜</th></tr></thead><tbody>
  {posts.map(p=><tr key={p.id}><td>{p.request_no}</td><td><Link className="board-title" href={`/estimate/board/${p.request_no}`}>{postTitle(p.parts)}</Link></td><td>{p.display_name}</td><td><span className={`status-chip status-${p.status}`}>{ESTIMATE_STATUS[p.status]}</span></td><td>{date(p.created_at)}</td></tr>)}
 </tbody></table></div>:<div className="empty">아직 등록된 견적 문의가 없습니다. 첫 견적 상담을 신청해 보세요.</div>}
 {pages>1&&<nav className="pager" aria-label="페이지">{Array.from({length:pages},(_,i)=>i+1).filter(n=>Math.abs(n-page)<=4||n===1||n===pages).map(n=><Link key={n} className={n===page?"active":""} href={`/estimate/board?page=${n}`}>{n}</Link>)}</nav>}
 </div>;
}
