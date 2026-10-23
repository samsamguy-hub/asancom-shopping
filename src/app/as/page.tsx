import type { Metadata } from "next";
import AsForm from "@/components/AsForm";
import { AS_GUIDE, AS_STEPS } from "@/lib/as-rules";
import { COMPANY } from "@/lib/company";
export const metadata:Metadata={title:"A/S 신청 | 아산컴마트",description:"아산컴마트 컴퓨터 A/S 신청. 조립PC·노트북·부품 점검과 수리, 매장 방문·택배·출장 접수"};
export default function AsPage(){
 return <div className="wide section narrow as-page"><div className="page-heading"><span className="eyebrow blue">AFTER SERVICE</span><h1>A/S 신청</h1><p>컴퓨터에 문제가 생겼나요? 신청서를 남기면 담당자가 연락드립니다. 급하시면 고객센터 <a className="text-link" href={`tel:${COMPANY.phone.replace(/-/g,"")}`}>{COMPANY.phone}</a>로 전화 주세요.</p></div>
 <ol className="as-steps">{AS_STEPS.map((s,i)=><li key={s.title}><span>{i+1}</span><strong>{s.title}</strong><small>{s.text}</small></li>)}</ol>
 <nav className="detail-tabs" aria-label="A/S 안내"><a href="#as-form">A/S 신청서</a><a href="#as-guide">A/S 안내</a></nav>
 <section id="as-form" className="detail-section"><h2>A/S 신청서</h2><AsForm/></section>
 <section id="as-guide" className="detail-section policy-page"><h2>A/S 안내</h2>{AS_GUIDE.map(s=><section key={s.title}><h2>{s.title}</h2><ul>{s.items.map((t,i)=><li key={i}>{t}</li>)}</ul></section>)}
  <p className="small-muted">영업시간: {COMPANY.hours} · 매장: {COMPANY.address}</p></section>
 </div>;
}
