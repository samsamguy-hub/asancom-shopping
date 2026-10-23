import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { cancelExpiredOrders, cancelOrder, saveOrderMemo, setOrderStatus } from "@/app/admin/order-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { formatKRW } from "@/lib/types";
import { CASH_RECEIPT, DEPOSIT_DAYS, depositDeadline, isDepositExpired, ORDER_STATUS, type Order, type OrderStatus } from "@/lib/order-rules";
export const dynamic="force-dynamic";
// 진행중 = 입금대기·입금확인·배송준비·배송중
const OPEN:OrderStatus[]=["pending","paid","preparing","shipping"];
const tabs=[["open","진행중"],...Object.entries(ORDER_STATUS),["all","전체"]] as [string,string][];
const FLOW:OrderStatus[]=["pending","paid","preparing","shipping","delivered"];
export default async function OrdersAdmin({searchParams}:{searchParams:Promise<{status?:string,error?:string,saved?:string,expired?:string}>}){
 const db=await requireAdmin();const sp=await searchParams;
 const tab=tabs.some(([k])=>k===sp.status)?sp.status!:"open";
 let q=db.from("orders").select("*,order_items(product_name,category,unit_price,quantity,line_total)").order("created_at",{ascending:false}).limit(200);
 q=tab==="all"?q:tab==="open"?q.in("status",OPEN):q.eq("status",tab);
 const {data,error}=await q;const rows=(data||[]) as Order[];
 const expired=rows.filter(o=>o.status==="pending"&&isDepositExpired(o.created_at)).length;
 const hidden=(o:Order)=><><input type="hidden" name="id" value={o.id}/><input type="hidden" name="tab" value={tab}/></>;
 return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><h1>주문 관리</h1><p>무통장입금 주문입니다. 통장에서 입금을 확인한 뒤 &lsquo;입금확인&rsquo;으로 바꾸고, 진행에 따라 상태를 바꿔 주세요. 주문 취소 시 재고가 자동으로 돌아옵니다.</p>
 {error?<p className="compat bad">주문 테이블이 없습니다. Supabase SQL Editor에서 supabase/members_orders.sql을 먼저 실행하세요.</p>:<>
 {sp.error&&<p className="compat bad" role="alert">처리하지 못했습니다. 다시 시도하세요.</p>}{sp.saved&&!sp.error&&<p className="compat good" role="status">처리되었습니다.</p>}
 {sp.expired!==undefined&&<p className="compat good" role="status">입금 기한이 지난 주문 {Number(sp.expired)||0}건을 취소했습니다.</p>}
 {expired>0&&<form action={cancelExpiredOrders} className="compat warn expired-bar"><input type="hidden" name="tab" value={tab}/><span>입금 기한({DEPOSIT_DAYS}일)이 지난 입금대기 주문이 {expired}건 있습니다. 자동 취소는 매시 정각에 실행됩니다.</span><ConfirmButton className="btn small danger" message={`입금 기한이 지난 주문 ${expired}건을 지금 취소할까요?\n재고가 복구되며 되돌릴 수 없습니다.`}>지금 모두 취소</ConfirmButton></form>}
 <div className="filter-pills">{tabs.map(([k,l])=><Link key={k} className={k===tab?"active":""} href={`/admin/orders?status=${k}`}>{l}</Link>)}</div>
 {rows.length?<ul className="review-admin estimate-admin">{rows.map(o=><li key={o.id}>
  <div className="review-head"><strong>{o.order_no} · {formatKRW(o.total)}</strong><span className={`status-chip order-${o.status}`}>{ORDER_STATUS[o.status]}</span><span className="tiny-badge">{o.user_id?"회원":"비회원"}</span>{o.status==="pending"&&<span className={`tiny-badge${isDepositExpired(o.created_at)?" alt":""}`}>입금기한 {depositDeadline(o.created_at)}{isDepositExpired(o.created_at)&&" (지남)"}</span>}<small>{new Date(o.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</small></div>
  <div className="estimate-contact"><span>주문자 <strong>{o.orderer_name}</strong></span><span>전화 <a className="text-link" href={`tel:${o.orderer_phone.replace(/-/g,"")}`}>{o.orderer_phone}</a></span>{o.orderer_email&&<span>이메일 {o.orderer_email}</span>}<span>입금자명 <strong>{o.depositor_name}</strong></span>{o.cash_receipt_type!=="none"&&<span>현금영수증 {CASH_RECEIPT[o.cash_receipt_type]} {o.cash_receipt_number}</span>}</div>
  <p className="small-muted">{o.is_pickup?`${o.shipping_name} (매장 방문 수령)`:`${o.shipping_name} · ${o.receiver_name} ${o.receiver_phone} · (${o.zipcode}) ${o.address1} ${o.address2}`}{o.delivery_memo&&` · 메모: ${o.delivery_memo}`}</p>
  <table className="info-table compact"><tbody>{(o.order_items||[]).map((i,k)=><tr key={k}><th>{i.category}</th><td>{i.product_name} × {i.quantity}</td><td>{formatKRW(i.line_total)}</td></tr>)}<tr><th>합계</th><td>상품 {formatKRW(o.goods_total)} + 배송 {formatKRW(o.shipping_fee)} + VAT {formatKRW(o.vat)}</td><td><strong>{formatKRW(o.total)}</strong></td></tr></tbody></table>
  {o.status!=="canceled"&&<div className="table-actions">{FLOW.filter(s=>s!==o.status).map(s=><form key={s} action={setOrderStatus}>{hidden(o)}<input type="hidden" name="status" value={s}/><button className="btn secondary small">{ORDER_STATUS[s]}</button></form>)}
   <form action={cancelOrder}>{hidden(o)}<ConfirmButton className="link-button danger" message={`${o.order_no} 주문을 취소할까요?\n재고가 복구되며 되돌릴 수 없습니다. 이미 입금받았다면 환불해 주세요.`}>주문 취소</ConfirmButton></form></div>}
  <form action={saveOrderMemo} className="reply-form">{hidden(o)}<label>관리자 메모 (고객에게 보이지 않음)<textarea name="memo" maxLength={2000} rows={2} defaultValue={o.admin_memo||""} placeholder="입금 확인 내용, 송장번호 등"/></label><button className="btn secondary small">메모 저장</button></form>
 </li>)}</ul>:<div className="empty">해당 상태의 주문이 없습니다.</div>}</>}
 </div>;
}
