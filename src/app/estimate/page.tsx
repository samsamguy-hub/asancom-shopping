import Link from "next/link";
import type { Metadata } from "next";
import EstimateForm from "@/components/EstimateForm";
import { getEstimateParts } from "@/lib/estimates";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"조립PC 견적 상담 | 아산컴마트"};
export default async function EstimatePage(){
 const {byCategory,available}=await getEstimateParts();
 return <div className="wide section narrow estimate-page"><div className="page-heading"><span className="eyebrow blue">PC ESTIMATE</span><h1>조립PC 견적 상담 신청</h1><p>원하는 부품을 고르고 연락처를 남기면 매장에서 가격과 호환성을 확인해 연락드립니다. 신청 내용은 <Link className="text-link" href="/estimate/board">견적게시판</Link>에 이름 첫 글자와 부품만 표시되고, 전화번호는 공개되지 않습니다.</p></div>
 {available?<EstimateForm byCategory={byCategory}/>:<div className="empty">견적 상담 신청 준비 중입니다. 전화 041-542-3342로 문의해 주세요.</div>}
 <p className="small-muted">부품 가격과 호환성을 직접 비교해 보려면 <Link className="text-link" href="/builder">호환성 견적 계산기</Link>를 이용하세요.</p></div>;
}
