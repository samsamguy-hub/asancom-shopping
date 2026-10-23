import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCustomer } from "@/lib/session";
import { saveProfile } from "@/app/mypage/actions";
import OrderDetail from "@/components/OrderDetail";
import AddressFields from "@/components/AddressFields";
import { WithdrawForm } from "@/components/PasswordForms";
import type { Order } from "@/lib/order-rules";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"마이페이지 | 아산컴마트"};
export default async function MyPage({searchParams}:{searchParams:Promise<{saved?:string,error?:string}>}){
 const customer=await getCustomer();if(!customer)redirect("/login?next=/mypage");
 const sp=await searchParams;const db=await createClient();
 // 본인 주문만 조회 (RLS: user_id = auth.uid())
 const {data,error}=await db.from("orders").select("*,order_items(product_name,unit_price,quantity,line_total)").eq("user_id",customer.id).order("created_at",{ascending:false}).limit(50);
 const orders=(data||[]) as Order[];const p=customer.profile;
 return <div className="wide section narrow"><div className="page-heading"><span className="eyebrow blue">MY PAGE</span><h1>마이페이지</h1><p>{p?.name||customer.email}님, 반갑습니다.</p></div>
  <section className="detail-section"><h2>주문 내역</h2>{error?<p className="compat bad">주문 기능 준비 중입니다.</p>:orders.length?<div className="order-list">{orders.map(o=><OrderDetail key={o.id} o={{...o,items:o.order_items||[]}}/>)}</div>:<div className="empty">주문 내역이 없습니다. <Link className="text-link" href="/products">상품 보러 가기</Link></div>}</section>
  <section id="profile" className="detail-section"><h2>내 정보</h2>
   {sp.saved&&<p className="compat good" role="status">저장되었습니다.</p>}{sp.error&&<p className="compat bad" role="alert">저장하지 못했습니다. 이름(2~20자)과 휴대폰번호 형식을 확인하세요.</p>}
   {p?<form action={saveProfile} className="admin-form"><p className="small-muted">아이디(이메일): {customer.email}</p><div className="form-grid">
    <label>이름<input name="name" required minLength={2} maxLength={20} defaultValue={p.name}/></label>
    <label>휴대폰번호<input name="phone" type="tel" maxLength={13} defaultValue={p.phone} placeholder="010-1234-5678"/></label>
    <AddressFields defaults={{zipcode:p.zipcode,address1:p.address1,address2:p.address2}}/></div>
    <button className="btn primary" type="submit">내 정보 저장</button></form>:<p className="compat bad">회원 정보를 불러오지 못했습니다.</p>}
   </section>
  <section className="detail-section"><h2>계정 관리</h2><div className="account-manage"><Link className="btn secondary small" href="/account/password">비밀번호 변경</Link><WithdrawForm email={customer.email}/></div></section>
 </div>;
}
