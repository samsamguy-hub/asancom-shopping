import Link from "next/link";
import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
export const metadata:Metadata={title:"회사소개 | 아산컴마트",description:"충남 아산 온양고 앞 컴퓨터 전문매장 아산컴마트. 조립PC, 중고컴퓨터, 컴퓨터수리, 기업납품"};
const services=[
 {icon:"▣",title:"조립컴퓨터",text:"사무용부터 게이밍·작업용까지 용도와 예산에 맞춰 부품을 고르고 조립합니다."},
 {icon:"♻",title:"중고컴퓨터",text:"점검을 마친 중고 PC와 부품을 합리적인 가격에 판매합니다."},
 {icon:"⚙",title:"컴퓨터 수리",text:"고장 진단, 부품 교체, 업그레이드, 운영체제 설치를 도와드립니다."},
 {icon:"▤",title:"기업·기관 납품",text:"사무실·학교·기관에 필요한 PC와 주변기기를 견적 상담 후 납품합니다."},
];
export default function About(){return <div className="wide section narrow about-page">
 <div className="page-heading"><span className="eyebrow blue">ABOUT US</span><h1>아산컴마트를 소개합니다</h1><p>아산 온양고 앞에서 컴퓨터 판매·조립·수리를 하는 컴퓨터 전문매장입니다. 온라인에서 상품과 견적을 비교해 보고, 궁금한 점은 매장과 전화로 편하게 상담하세요.</p></div>
 <div className="about-services">{services.map(s=><div key={s.title}><span aria-hidden="true">{s.icon}</span><strong>{s.title}</strong><p>{s.text}</p></div>)}</div>
 <section className="about-visit"><h2>매장 안내</h2><table className="info-table"><tbody>
  <tr><th>주소</th><td>{COMPANY.address} <a className="text-link" href={`https://map.naver.com/p/search/${encodeURIComponent("아산시 온천대로 1408")}`} target="_blank" rel="noopener noreferrer">지도 보기 ↗</a></td></tr>
  <tr><th>전화</th><td><a href={`tel:${COMPANY.phone.replace(/-/g,"")}`}>{COMPANY.phone}</a></td></tr>
  <tr><th>영업시간</th><td>{COMPANY.hours}</td></tr>
  <tr><th>주차</th><td>{COMPANY.parking}</td></tr>
  <tr><th>이메일</th><td>{COMPANY.email}</td></tr>
 </tbody></table><p className="small-muted">방문 전 재고와 영업 여부를 전화로 확인해 주세요.</p></section>
 <div className="detail-actions"><Link className="btn primary" href="/products">상품 보러 가기</Link><Link className="btn secondary" href="/estimate">PC 견적 상담</Link></div>
</div>}
