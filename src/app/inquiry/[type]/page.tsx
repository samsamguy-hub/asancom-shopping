import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InquiryForm from "@/components/InquiryForm";
import { COMPANY } from "@/lib/company";
import { INQUIRY_STEPS, INQUIRY_TYPES, isInquiryType } from "@/lib/inquiry-rules";
// 홈페이지 제작(/inquiry/web)·앱 개발(/inquiry/app)·창업(/inquiry/startup) 문의 신청
export function generateStaticParams(){return Object.keys(INQUIRY_TYPES).map(type=>({type}));}
export async function generateMetadata({params}:{params:Promise<{type:string}>}):Promise<Metadata>{const {type}=await params;if(!isInquiryType(type))return {};return {title:`${INQUIRY_TYPES[type].label} | 아산컴마트`,description:`아산컴마트 ${INQUIRY_TYPES[type].label}. ${INQUIRY_TYPES[type].intro}`};}
export default async function InquiryPage({params}:{params:Promise<{type:string}>}){
 const {type}=await params;if(!isInquiryType(type))notFound();const info=INQUIRY_TYPES[type];
 return <div className="wide section narrow as-page"><div className="page-heading"><span className="eyebrow blue">{info.eyebrow} INQUIRY</span><h1>{info.label}</h1><p>{info.intro} 신청서를 남기면 담당자가 연락드립니다. 급하시면 <a className="text-link" href={`tel:${COMPANY.phone.replace(/-/g,"")}`}>{COMPANY.phone}</a>로 전화 주세요.</p></div>
 <nav className="filter-pills inquiry-switch" aria-label="문의 종류">{Object.entries(INQUIRY_TYPES).map(([k,v])=><Link key={k} href={`/inquiry/${k}`} className={k===type?"active":""}>{v.icon} {v.label}</Link>)}</nav>
 <ol className="as-steps">{INQUIRY_STEPS.map((s,i)=><li key={s.title}><span>{i+1}</span><strong>{s.title}</strong><small>{s.text}</small></li>)}</ol>
 <section className="detail-section"><h2>{info.label} 신청서</h2><InquiryForm key={type} type={type}/></section>
 <p className="small-muted">상담은 무료이며, 비용은 필요한 기능·규모를 확인한 뒤 안내드립니다. 영업시간: {COMPANY.hours}</p>
 </div>;
}
