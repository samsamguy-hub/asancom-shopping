"use client";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { formatKRW } from "@/lib/types";
import { BUILD_SLOTS, checkBuild, statusText, type BuildParts, type SlotKey } from "@/lib/compat";
import { isSoldOut } from "@/lib/product-status";
import { VAT_LABEL, vatOf, withVat } from "@/lib/pricing";
const ASSEMBLY_FEE=30000;
const icons={ok:"✓",warn:"!",unknown:"?",fail:"✕"} as const;
// 부품은 고객이 직접 선택 (임의의 첫 상품 자동 선택 안 함). 표시 금액·검사는 참고용이며 실제 금액은 서버·매장에서 재확인
export default function PCBuilder({products,isDemo}:{products:Product[],isDemo:boolean}) {
 const options = useMemo(()=>Object.fromEntries(BUILD_SLOTS.map(s=>[s.key,products.filter(p=>p.category===s.category&&!isSoldOut(p))])) as Record<SlotKey,Product[]>,[products]);
 const [selection,setSelection] = useState<Partial<Record<SlotKey,string>>>({});
 const [assembly,setAssembly]=useState(true);
 const parts:BuildParts=Object.fromEntries(BUILD_SLOTS.map(s=>[s.key,options[s.key].find(p=>p.id===selection[s.key])]).filter(([,p])=>p));
 const result=checkBuild(parts);
 const total=BUILD_SLOTS.reduce((v,s)=>v+(parts[s.key]?.price||0),assembly?ASSEMBLY_FEE:0);
 const overall={
  incomplete:{cls:"neutral",title:"부품을 모두 선택하면 호환성을 검사합니다",text:`미선택: ${result.missingParts.join(", ")}`},
  fail:{cls:"bad",title:"✕ 호환되지 않는 항목이 있습니다",text:"아래 비호환 항목의 부품을 바꿔 주세요."},
  needs_check:{cls:"warn",title:"? 확인이 필요한 항목이 있습니다",text:"규격 정보가 부족하거나 주의가 필요한 항목입니다. 호환된다고 단정할 수 없으니 매장에 문의하세요."},
  ok:{cls:"good",title:"✓ 입력된 규격 기준으로 모든 항목 호환",text:"실제 조립 전 매장에서 실물 장착을 최종 확인합니다."},
 }[result.overall];
 const quoteText=`아산컴마트 조립PC 견적 (${new Date().toLocaleDateString('ko-KR')})\n`+BUILD_SLOTS.map(s=>`${s.category}: ${parts[s.key]?.name||(s.key==="cooler"?"CPU 기본 쿨러 사용":"미선택")} / ${parts[s.key]?formatKRW(parts[s.key]!.price):'-'}`).join("\n")+`\n조립서비스: ${assembly?formatKRW(ASSEMBLY_FEE):'선택 안 함'}\n공급가 합계(${VAT_LABEL}): ${formatKRW(total)}\n부가세(10%): ${formatKRW(vatOf(total))}\n예상합계(VAT 포함): ${formatKRW(withVat(total))}\n`+`호환성: ${overall.title.replace(/^[✓✕?] /,"")}\n`+result.checks.filter(c=>c.status!=="ok").map(c=>`- [${statusText[c.status]}] ${c.title}: ${c.messages.join(" ")}`).join("\n")+`\n최종 사양·가격·재고는 아산컴마트에서 확인 필요. ${isDemo?'가상상품/가상가격임.':''}`;
 return <div className="builder-layout"><div><div className="builder-parts">{BUILD_SLOTS.map(({key,category,required})=>{const product=parts[key];const list=options[key];return <div className="builder-row" key={key}><label htmlFor={`part-${key}`}><span>▣</span><strong>{category}{!required&&<small> (선택)</small>}</strong></label><select id={`part-${key}`} value={product?.id||""} onChange={e=>setSelection(old=>({...old,[key]:e.target.value||undefined}))} disabled={!list.length&&required}><option value="" disabled={required}>{key==="cooler"?"CPU 기본 쿨러 사용 (선택 안 함)":list.length?"제품을 선택하세요":"등록된 상품 없음"}</option>{list.map(p=><option key={p.id} value={p.id}>{p.name} · {formatKRW(p.price)} ({VAT_LABEL})</option>)}</select><strong className="part-price">{product?formatKRW(product.price):"—"}</strong></div>})}</div>
 {result.checks.length>0&&<section className="compat-checks"><h2>호환성 검사</h2><ul>{result.checks.map(c=><li key={c.id} className={`check-${c.status}`}><div className="check-head"><span className="check-icon" aria-hidden="true">{icons[c.status]}</span><strong>{c.title}</strong><span className="check-status">{statusText[c.status]}</span></div>{c.messages.map((m,i)=><p key={i}>{m}</p>)}</li>)}</ul><p className="small-muted">‘확인 필요’는 상품의 규격 정보가 부족해 판단하지 않은 항목입니다. 메모리 높이와 쿨러 간섭, M.2 슬롯 수, 케이블 길이 등은 매장에서 실물로 확인합니다.</p></section>}</div>
 <aside className="builder-summary"><div className="summary-top"><span className="eyebrow blue">MY PC ESTIMATE</span><h2>나의 PC 견적</h2><p>선택한 부품의 합계 금액</p></div><div className="summary-lines">{BUILD_SLOTS.map(({key,category})=><div key={key}><span>{category}</span><strong>{parts[key]?formatKRW(parts[key]!.price):key==="cooler"?"기본 쿨러":"미선택"}</strong></div>)}</div><label className="checkbox-row"><input type="checkbox" checked={assembly} onChange={e=>setAssembly(e.target.checked)}/> 기본 조립 서비스 (+{formatKRW(ASSEMBLY_FEE)}, 예시)</label><div className="summary-lines"><div><span>공급가 합계 ({VAT_LABEL})</span><strong>{formatKRW(total)}</strong></div><div><span>부가세 (10%)</span><strong>{formatKRW(vatOf(total))}</strong></div></div><div className="summary-total"><span>예상 합계<small> VAT 포함</small></span><strong>{formatKRW(withVat(total))}</strong></div><p className="small-muted">배송·출장설치비는 장바구니·주문 상담 시 선택합니다.</p><div className={`compat ${overall.cls}`}><strong>{overall.title}</strong><p>{overall.text}</p></div><button className="btn primary full" onClick={()=>navigator.clipboard.writeText(quoteText)}>견적서 내용 복사</button><button className="btn secondary full" onClick={()=>window.print()}>견적 인쇄 / PDF 저장</button><p className="small-muted">{isDemo?"가상 상품/가상 가격입니다. ":""}자동결제는 지원하지 않습니다. 표시 금액과 호환성은 참고용이며 실제 금액·재고는 매장에서 확인합니다.</p></aside></div>
}
