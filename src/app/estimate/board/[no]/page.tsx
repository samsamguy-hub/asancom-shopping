import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ESTIMATE_CATEGORIES, ESTIMATE_STATUS, getBoardPost, postTitle } from "@/lib/estimates";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"견적게시판 | 아산컴마트"};
export default async function EstimatePostPage({params}:{params:Promise<{no:string}>}){
 const {no}=await params;const post=/^\d{1,12}$/.test(no)?await getBoardPost(Number(no)):null;
 if(!post)notFound();
 return <div className="wide section narrow"><Link href="/estimate/board" className="text-link">← 견적게시판</Link>
  <div className="page-heading"><span className="eyebrow blue">ESTIMATE #{post.request_no}</span><h1>{postTitle(post.parts)}</h1><p className="muted">작성자 {post.display_name} · {new Date(post.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})} · <span className={`status-chip status-${post.status}`}>{ESTIMATE_STATUS[post.status]}</span></p></div>
  <table className="info-table"><tbody>{ESTIMATE_CATEGORIES.map(c=><tr key={c}><th>{c}</th><td>{post.parts[c]||<span className="muted">선택 안 함</span>}</td></tr>)}</tbody></table>
  <p className="small-muted">가격은 상담 시 재고와 시세를 확인해 안내합니다. 연락처와 요청사항은 공개되지 않습니다.</p>
  <div className="detail-actions"><Link className="btn primary" href="/estimate">나도 견적 상담 신청</Link><a className="btn secondary" href="tel:0415423342">전화 문의 041-542-3342</a></div></div>;
}
