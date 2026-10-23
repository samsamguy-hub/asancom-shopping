import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { deleteShippingOption, saveShippingOption, type ShippingErrorCode } from "@/app/admin/shipping-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { formatKRW } from "@/lib/types";
import { VAT_LABEL, withVat, type ShippingOption } from "@/lib/pricing";
export const dynamic="force-dynamic";
const messages:Record<ShippingErrorCode,string>={name:"이름은 1~60자로 입력하세요.",description:"설명은 200자 이하로 입력하세요.",lead_time:"소요 기간은 60자 이하로 입력하세요.",fee:"비용은 0원 이상 1,000만원 이하 정수로 입력하세요.",sort:"표시 순서는 -1000~1000 정수로 입력하세요.",id:"잘못된 요청입니다.",db:"저장에 실패했습니다. 잠시 후 다시 시도하세요."};
// 한 줄 입력 폼 (기존 방법 수정·새 방법 추가 공용)
function OptionForm({o}:{o?:ShippingOption}){return <form action={saveShippingOption} className="shipping-form">{o&&<input type="hidden" name="id" value={o.id}/>}
 <label>이름<input name="name" required maxLength={60} defaultValue={o?.name||""} placeholder="출장 설치 - 온양 지역"/></label>
 <label>설명 (고객 화면 표시)<input name="description" maxLength={200} defaultValue={o?.description||""} placeholder="방문 일정은 주문 후 전화로 안내"/></label>
 <label>소요 기간<input name="lead_time" maxLength={60} defaultValue={o?.lead_time||""} placeholder="평균 2~3일 소요"/></label>
 <label>비용 (원, {VAT_LABEL})<input name="fee" required inputMode="numeric" defaultValue={o?String(o.fee):""} placeholder="0 = 무료"/></label>
 <label>표시 순서<input name="sort_order" inputMode="numeric" defaultValue={String(o?.sort_order??0)}/></label>
 <label className="check"><input type="checkbox" name="active" defaultChecked={o?.active??true}/> 고객에게 표시</label>
 <button className="btn primary small" type="submit">{o?"저장":"추가"}</button></form>}
export default async function ShippingAdmin({searchParams}:{searchParams:Promise<{error?:string,saved?:string}>}){
 const db=await requireAdmin();const sp=await searchParams;
 // 관리자는 숨긴(비활성) 방법까지 조회 (RLS: is_admin). 전체 열: lead_time 열 추가 전에도 조회되도록
 const {data,error}=await db.from("shipping_options").select("*").order("sort_order").order("name");
 const options=(data||[]) as ShippingOption[];
 const message=sp.error&&sp.error in messages?messages[sp.error as ShippingErrorCode]:"";
 return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><h1>배송·설치비 관리</h1><p>장바구니에서 고객이 고르는 배송·출장설치 방법과 비용입니다. 비용은 상품 가격처럼 {VAT_LABEL} 금액이며, 결제 금액에는 부가세 10%가 더해집니다.</p>
 {error?<p className="compat bad">배송 방법 테이블이 없습니다. Supabase SQL Editor에서 supabase/shipping_options.sql을 먼저 실행하세요.</p>:<>
 {message&&<p className="compat bad" role="alert">{message}</p>}{sp.saved&&!message&&<p className="compat good">저장되었습니다.</p>}
 <div className="shipping-admin">{options.map(o=><div key={o.id} className={`shipping-admin-row${o.active?"":" inactive"}`}><OptionForm o={o}/><div className="shipping-admin-meta"><span>{o.active?"표시 중":"숨김"} · 고객 결제 시 {o.fee?formatKRW(withVat(o.fee)):"무료"} (VAT 포함)</span><form action={deleteShippingOption}><input type="hidden" name="id" value={o.id}/><ConfirmButton className="link-button danger" message={`'${o.name}' 방법을 삭제할까요? 잠시 숨기려면 '고객에게 표시'를 끄세요.`}>삭제</ConfirmButton></form></div></div>)}
 {!options.length&&<div className="empty">등록된 배송·설치 방법이 없습니다. 아래에서 추가하세요.</div>}</div>
 <h2>새 방법 추가</h2><div className="shipping-admin-row"><OptionForm/></div></>}
 </div>}
