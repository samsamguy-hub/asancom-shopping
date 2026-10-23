// 가격·부가세 규칙 (브라우저·서버 공용). 상품 가격·배송·설치·조립비는 모두 VAT 별도 금액(공급가)
// 최종 금액 = 공급가 합계 + 부가세(공급가 합계의 10%, 원 미만 버림). 실제 주문 금액은 항상 서버가 이 규칙으로 다시 계산
export const VAT_RATE = 0.1;
export const VAT_LABEL = "VAT 별도";
// 원 미만 버림. 정수 나눗셈으로 계산해 DB 주문 함수(create_order: (상품+배송비)/10)와 항상 같은 값
export const vatOf = (supply: number) => Math.floor(Math.round(supply) / 10);
export const withVat = (supply: number) => supply + vatOf(supply);
// lead_time: 소요 기간 안내 문구 (supabase/shipping_lead_time.sql 적용 전에는 없음)
export type ShippingOption = { id: string; name: string; description: string; fee: number; lead_time?: string; active?: boolean; sort_order?: number };
