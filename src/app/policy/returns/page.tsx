import Link from "next/link";
import type { Metadata } from "next";
import { RETURN_POLICY } from "@/lib/policy";
export const metadata:Metadata={title:"교환·반품·취소 안내 | 아산컴마트"};
export default function ReturnsPolicy(){return <div className="wide section narrow policy-page"><Link href="/products" className="text-link">← 상품목록</Link><div className="page-heading"><span className="eyebrow blue">RETURN & EXCHANGE</span><h1>교환·반품·취소 안내</h1><p>궁금한 점은 고객센터 041-542-3342로 문의해 주세요.</p></div>
 {RETURN_POLICY.map(s=><section key={s.title}><h2>{s.title}</h2><ul>{s.items.map((t,i)=><li key={i}>{t}</li>)}</ul></section>)}
 <p className="small-muted">전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령이 이 안내보다 우선합니다.</p></div>}
