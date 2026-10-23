"use server";
import { headers } from "next/headers";
import { createClient, dbConfigured } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/estimate-rules";
import type { OrderItem, OrderStatus } from "@/lib/order-rules";
// 비회원 주문조회: 주문번호 + 주문자 휴대폰번호가 모두 맞아야 함 (DB 함수 lookup_order). 무작위 대입 방지로 10분에 10회 제한
export type LookupResult = { order_no: string; status: OrderStatus; created_at: string; orderer_name: string; shipping_name: string; shipping_fee: number; is_pickup: boolean; receiver_name: string; address1: string; address2: string; goods_total: number; vat: number; total: number; bank_account: string; depositor_name: string; items: OrderItem[] };
export type LookupState = { ok: true; order: LookupResult } | { ok: false; message: string } | null;
const recent = new Map<string, number[]>();
function tooMany(key: string) {
  const now = Date.now(), list = (recent.get(key) || []).filter(t => now - t < 10 * 60_000);
  if (list.length >= 10) { recent.set(key, list); return true; }
  recent.set(key, [...list, now]);
  if (recent.size > 5000) recent.clear();
  return false;
}
export async function lookupOrder(_prev: LookupState, formData: FormData): Promise<LookupState> {
  if (!dbConfigured()) return { ok: false, message: "DB 연결 후 조회할 수 있습니다." };
  const orderNo = String(formData.get("order_no") || "").trim().toUpperCase(), phone = normalizePhone(String(formData.get("phone") || ""));
  if (!/^AC\d{6}-[0-9A-F]{6}$/.test(orderNo) || !phone) return { ok: false, message: "주문번호(예: AC261022-1A2B3C)와 휴대폰번호를 확인하세요." };
  const h = await headers();
  if (tooMany(h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local")) return { ok: false, message: "잠시 후 다시 조회해 주세요." };
  const db = await createClient();
  const { data, error } = await db.rpc("lookup_order", { p_order_no: orderNo, p_phone: phone });
  if (error) { console.error("주문 조회 실패", error.code, error.message); return { ok: false, message: "조회하지 못했습니다. 잠시 후 다시 시도하세요." }; }
  if (!data) return { ok: false, message: "일치하는 주문이 없습니다. 주문번호와 휴대폰번호를 확인하세요." };
  return { ok: true, order: data as LookupResult };
}
