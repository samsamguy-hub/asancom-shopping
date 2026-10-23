import { createPublicClient, dbConfigured } from "@/lib/supabase/server";
import type { ShippingOption } from "@/lib/pricing";
// DB 연결 전 시연용 (supabase/shipping_options.sql·shipping_lead_time.sql 의 기본값과 같음)
export const DEMO_SHIPPING: ShippingOption[] = [
  { id: "demo-parcel", name: "택배 배송", description: "전국 택배 발송 (제주·도서산간 추가 요금은 주문 상담 시 안내)", fee: 5000, lead_time: "평균 2~3일 소요" },
  { id: "demo-asan", name: "출장 설치 - 아산 지역", description: "아산시 지역 방문 설치", fee: 0, lead_time: "1~2일 소요" },
  { id: "demo-cheonan", name: "출장 설치 - 천안 지역", description: "천안시 지역 방문 설치", fee: 50000, lead_time: "1~2일 소요" },
  { id: "demo-pickup", name: "매장 방문 수령", description: "충남 아산시 온천대로 1408 (온양고 앞) 매장에서 직접 수령", fee: 0 },
];
// 고객 화면·주문 계산용: 사용 중(active)인 방법만. 관리자로 로그인해 있어도 비활성 방법은 고객 계산에 쓰지 않음
// shipping_options 테이블이 아직 없으면(SQL 적용 전) 빈 목록 → 장바구니는 "배송 방법 상담 안내"로 동작
// 전체 열 조회: lead_time 열 추가 SQL 적용 전에도 실패하지 않도록
export async function getShippingOptions(): Promise<ShippingOption[]> {
  if (!dbConfigured()) return DEMO_SHIPPING;
  const db = createPublicClient();
  const { data, error } = await db.from("shipping_options").select("*").eq("active", true).order("sort_order").order("name");
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    throw new Error("배송 방법 조회 실패: " + error.message);
  }
  return ((data || []) as ShippingOption[]).map(({ id, name, description, fee, lead_time }) => ({ id, name, description, fee, lead_time: lead_time || "" }));
}
