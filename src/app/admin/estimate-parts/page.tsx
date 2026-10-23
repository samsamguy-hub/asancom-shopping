import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { addDefaultEstimateParts, addEstimateParts, deleteEstimatePart, updateEstimatePart, type PartErrorCode } from "@/app/admin/estimate-actions";
import { DEFAULT_ESTIMATE_PARTS } from "@/lib/estimate-defaults";
import ConfirmButton from "@/components/ConfirmButton";
import { ESTIMATE_CATEGORIES, isEstimateCategory, type EstimatePart } from "@/lib/estimate-rules";
export const dynamic="force-dynamic";
const messages:Record<PartErrorCode,string>={category:"분류가 올바르지 않습니다.",name:"제품명은 1~120자로 입력하세요.",empty:"추가할 제품명을 한 줄에 하나씩 입력하세요.",too_many:"한 번에 200개까지 추가할 수 있습니다.",sort:"순서는 정수로 입력하세요.",duplicate:"같은 분류에 같은 제품명이 이미 있습니다.",db:"저장하지 못했습니다. 잠시 후 다시 시도하세요."};
const examples:Record<string,string>={"CPU":"AMD 라이젠5 7500F\nAMD 라이젠7 7800X3D\n인텔 코어 i5-14400F","메인보드":"B650M\nB760M DDR5","메모리":"DDR5 16GB\nDDR5 32GB (16GBx2)","그래픽카드":"RTX 4060\nRTX 4070 SUPER","SSD":"NVMe 500GB\nNVMe 1TB","파워":"600W 80PLUS 브론즈\n750W 80PLUS 골드","케이스":"미들타워 화이트\n미들타워 블랙","CPU쿨러":"기본 쿨러\n공랭 타워형\n수랭 240mm","O/S":"Windows 11 Home\nWindows 11 Pro","조립선택":"조립 요청\n부품만 구매"};
export default async function EstimatePartsAdmin({searchParams}:{searchParams:Promise<{category?:string,error?:string,saved?:string,added?:string,skipped?:string}>}){
 const db=await requireAdmin();const sp=await searchParams;
 const category=sp.category&&isEstimateCategory(sp.category)?sp.category:"CPU";
 // 관리자는 숨긴 항목까지 전체 조회 (RLS: is_admin)
 const {data,error}=await db.from("estimate_parts").select("id,category,name,active,sort_order").order("sort_order").order("name");
 const all=(data||[]) as EstimatePart[];const list=all.filter(p=>p.category===category);
 const message=sp.error&&sp.error in messages?messages[sp.error as PartErrorCode]:"";
 return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><h1>견적 부품 관리</h1><p>고객 <Link className="text-link" href="/estimate" target="_blank">견적 상담 신청</Link> 화면의 선택 목록입니다. 가격 없이 제품명만 등록하며, 상품 관리(판매 상품)와는 따로 관리됩니다.</p>
 {error?<p className="compat bad">견적 테이블이 없습니다. Supabase SQL Editor에서 supabase/estimates.sql을 먼저 실행하세요.</p>:<>
 {message&&<p className="compat bad" role="alert">{message}</p>}
 {sp.added!==undefined&&<p className="compat good" role="status">{Number(sp.added)||0}개를 추가했습니다.{Number(sp.skipped)>0&&` (이미 있는 ${Number(sp.skipped)}개는 건너뜀)`}</p>}
 {sp.saved&&!message&&<p className="compat good" role="status">저장되었습니다.</p>}
 <form action={addDefaultEstimateParts} className="compat neutral defaults-bar"><input type="hidden" name="category" value={category}/><span><strong>기본 품목 한 번에 넣기</strong>요즘 많이 쓰는 CPU·메인보드·메모리·그래픽카드·SSD·파워·케이스 {Object.values(DEFAULT_ESTIMATE_PARTS).reduce((n,l)=>n+(l?.length||0),0)}개를 넣습니다. 이미 있는 이름은 건너뛰며, 넣은 뒤 필요 없는 항목은 숨기거나 삭제하세요.</span><ConfirmButton className="btn primary small" message={"기본 품목을 견적 부품 목록에 넣을까요?\n이미 있는 이름은 건너뜁니다."}>기본 품목 넣기</ConfirmButton></form>
 <div className="filter-pills">{ESTIMATE_CATEGORIES.map(c=><Link key={c} className={c===category?"active":""} href={`/admin/estimate-parts?category=${encodeURIComponent(c)}`}>{c} ({all.filter(p=>p.category===c).length})</Link>)}</div>
 <form action={addEstimateParts} className="admin-form parts-add"><input type="hidden" name="category" value={category}/>
  <label>{category} 제품명 추가 — 한 줄에 하나씩, 여러 개를 한 번에 붙여넣을 수 있습니다<textarea name="names" rows={5} required placeholder={examples[category]}/></label>
  <button className="btn primary" type="submit">{category}에 추가</button></form>
 <h2 className="parts-heading">{category} 목록 ({list.length}개)</h2>
 {list.length?<div className="parts-list">{list.map(p=><div key={p.id} className={`parts-row${p.active?"":" inactive"}`}>
  <form action={updateEstimatePart} className="parts-form"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="category" value={category}/>
   <label className="sr-only" htmlFor={`n-${p.id}`}>제품명</label><input id={`n-${p.id}`} name="name" required maxLength={120} defaultValue={p.name}/>
   <label className="parts-sort">순서<input name="sort_order" inputMode="numeric" defaultValue={String(p.sort_order)}/></label>
   <label className="check"><input type="checkbox" name="active" defaultChecked={p.active}/> 고객에게 표시</label>
   <button className="btn secondary small" type="submit">저장</button></form>
  <form action={deleteEstimatePart}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="category" value={category}/><ConfirmButton className="link-button danger" message={`"${p.name}"을(를) 목록에서 삭제할까요? (이미 접수된 견적 글에는 영향 없음)`}>삭제</ConfirmButton></form>
 </div>)}</div>:<div className="empty">{category}에 등록된 제품이 없습니다. 위 칸에 제품명을 입력해 추가하세요.</div>}
 <p className="small-muted">순서 숫자가 작을수록 위에 표시됩니다. 잠시 빼려면 &lsquo;고객에게 표시&rsquo;를 끄고 저장하세요. 이미 접수된 견적 글에 적힌 제품명은 바뀌지 않습니다.</p></>}
 </div>;
}
