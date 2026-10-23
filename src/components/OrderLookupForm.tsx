"use client";
import { useActionState } from "react";
import { lookupOrder, type LookupState } from "@/app/order/lookup/actions";
import OrderDetail from "@/components/OrderDetail";
export default function OrderLookupForm(){
 const [state,action,pending]=useActionState<LookupState,FormData>(lookupOrder,null);
 return <><form action={action} className="auth-form"><label>주문번호<input name="order_no" required maxLength={20} placeholder="AC261022-1A2B3C" autoCapitalize="characters"/></label><label>주문자 휴대폰번호<input name="phone" required type="tel" inputMode="tel" maxLength={13} placeholder="010-1234-5678"/></label>
  {state&&!state.ok&&<p className="compat bad" role="alert">{state.message}</p>}<button className="btn primary full" type="submit" disabled={pending}>{pending?"조회 중...":"주문 조회"}</button></form>
  {state?.ok&&<div className="lookup-result"><OrderDetail o={state.order}/></div>}</>;
}
