import { formatKRW } from "@/lib/types";
import { BANK, depositDeadline, ORDER_STATUS, type OrderItem, type OrderStatus } from "@/lib/order-rules";
// 주문 한 건 표시 (마이페이지·비회원 주문조회 공용). 입금대기면 입금 계좌 안내
type View={order_no:string;status:OrderStatus;created_at:string;shipping_name:string;shipping_fee:number;is_pickup:boolean;receiver_name:string;address1:string;address2:string;goods_total:number;vat:number;total:number;depositor_name:string;items:OrderItem[]};
export default function OrderDetail({o}:{o:View}){
 return <article className="order-card"><div className="review-head"><strong>{o.order_no}</strong><span className={`status-chip order-${o.status}`}>{ORDER_STATUS[o.status]}</span><small>{new Date(o.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</small></div>
  <ul className="checkout-lines">{o.items.map((i,k)=><li key={k}><span>{i.product_name}</span><span>{i.quantity}개</span><strong>{formatKRW(i.line_total)}</strong></li>)}</ul>
  <div className="summary-lines"><div><span>상품 금액</span><strong>{formatKRW(o.goods_total)}</strong></div><div><span>배송비 ({o.shipping_name})</span><strong>{formatKRW(o.shipping_fee)}</strong></div><div><span>부가세</span><strong>{formatKRW(o.vat)}</strong></div><div><span>합계 (VAT 포함)</span><strong>{formatKRW(o.total)}</strong></div></div>
  <p className="small-muted">{o.is_pickup?"매장 방문 수령":`배송지: ${o.receiver_name} · ${o.address1} ${o.address2}`}</p>
  {o.status==="pending"&&<p className="compat warn">입금 대기 중입니다. {BANK.bank} {BANK.account} (예금주 {BANK.holder})로 {formatKRW(o.total)}을 <strong>{depositDeadline(o.created_at)}까지</strong> 입금해 주세요. 기한이 지나면 주문이 자동 취소됩니다. 입금자명: {o.depositor_name}</p>}
 </article>;
}
