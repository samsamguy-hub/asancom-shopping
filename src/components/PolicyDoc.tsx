import Link from "next/link";
import type { PolicySection } from "@/lib/policy";
// 약관·처리방침 공용 문서 레이아웃
export default function PolicyDoc({eyebrow,title,intro,date,sections}:{eyebrow:string,title:string,intro:string,date?:string,sections:PolicySection[]}){
 return <div className="wide section narrow policy-page"><Link href="/" className="text-link">← 홈</Link><div className="page-heading"><span className="eyebrow blue">{eyebrow}</span><h1>{title}</h1><p>{intro}</p>{date&&<p className="small-muted">시행일: {date}</p>}</div>
 {sections.map(s=><section key={s.title}><h2>{s.title}</h2><ul>{s.items.map((t,i)=><li key={i}>{t}</li>)}</ul></section>)}
 <p className="small-muted">관련 법령이 이 문서보다 우선합니다.</p></div>;
}
