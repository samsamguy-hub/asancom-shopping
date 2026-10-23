// A/S 신청 공용 규칙·안내 문구 (고객 폼·서버·관리자 공용, 서버 전용 코드 없음). 선택지는 supabase/as_requests.sql 의 제약과 같아야 함
// 안내 문구는 일반적인 컴퓨터 매장 A/S 안내 구성을 참고해 새로 작성한 초안입니다. [확인 필요]는 매장 기준으로 고치세요.
import type { PolicySection } from "@/lib/policy";
export const AS_PRODUCT_TYPES = ["조립PC(데스크탑)", "브랜드PC", "노트북", "모니터", "PC부품", "기타"] as const;
export const AS_PURCHASE_PLACES = ["아산컴마트 구매", "다른 곳에서 구매", "모름"] as const;
export const AS_SYMPTOMS = ["전원이 안 켜짐", "부팅이 안 됨", "화면이 안 나옴", "블루스크린·재부팅", "속도 저하", "소음·발열", "인터넷·네트워크", "부품 교체·업그레이드", "윈도우 설치", "기타"] as const;
export const AS_RECEIPT_METHODS = ["매장 방문", "택배 발송", "출장 방문 요청"] as const;
export const AS_STATUS = { received: "접수", checking: "점검중", repairing: "수리중", done: "수리완료", returned: "출고완료", canceled: "취소" } as const;
export type AsStatus = keyof typeof AS_STATUS;
export type AsRequest = { id: string; request_no: number; customer_name: string; phone: string; contact_time: string; product_type: string; purchase_place: string; purchase_date: string; symptom_type: string; symptom: string; receipt_method: string; visit_address: string; status: AsStatus; admin_memo: string | null; created_at: string };

export const AS_STEPS = [
  { title: "A/S 신청", text: "아래 신청서 작성 또는 전화 접수" },
  { title: "증상 상담", text: "담당자가 연락해 증상과 접수 방법 확인" },
  { title: "입고·방문", text: "매장 방문, 택배 발송 또는 출장 방문" },
  { title: "점검·견적", text: "원인 점검 후 비용 안내 (유상 수리는 동의 후 진행)" },
  { title: "수리·출고", text: "수리 완료 연락 후 수령 또는 발송" },
];

export const AS_GUIDE: PolicySection[] = [
  { title: "무상 보증 기준", items: [
    "아산컴마트 새 제품 조립PC: 구매일부터 1년 무상 보증 (조립·초기 불량 무상 점검). 부품 고장은 각 부품 제조사의 보증 기간을 따릅니다.",
    "부품 단품: 제조사·유통사 보증 기준을 따르며, 매장에서 제조사 A/S 접수를 대신해 드립니다. (대행 비용 30,000원)",
    "중고 제품: 구매일부터 1개월~3개월 무상 점검·수리 (제품마다 다르며 구매 시 안내)",
    "다른 곳에서 구매한 제품도 유상으로 점검·수리할 수 있습니다.",
  ] },
  { title: "보증 기간 안이라도 유상 수리인 경우", items: [
    "떨어뜨림, 충격, 침수, 액체를 쏟은 경우 등 사용자 과실로 고장 난 경우",
    "임의로 분해·개조하거나 다른 곳에서 수리한 뒤 생긴 고장",
    "낙뢰, 화재, 정전·전압 불안정 등 외부 원인으로 생긴 고장",
    "바이러스·악성코드, 프로그램 충돌, 윈도우 재설치 등 소프트웨어 문제",
    "소모품(쿨러 팬, 서멀 그리스, 키보드·마우스 등)의 자연 마모",
  ] },
  { title: "비용 안내 (VAT 별도)", items: [
    "기본 점검: 20,000원",
    "제조사 A/S 접수 대행: 30,000원",
    "윈도우 설치: 50,000원",
    "출장 방문: 아산 30,000원~, 그 외 지역 50,000원~ (거리·작업 내용에 따라 달라질 수 있음)",
    "부품 교체가 필요하면 부품 비용이 추가되며, 수리 전에 금액을 먼저 알려 드리고 동의를 받은 뒤 진행합니다.",
  ] },
  { title: "소요 기간", items: [
    "간단한 점검·수리: 입고 후 당일~2일 (부품 재고에 따라 달라질 수 있음)",
    "제조사 A/S가 필요한 부품: 보통 1~3주 (제조사 일정에 따름)",
  ] },
  { title: "맡기기 전 꼭 확인해 주세요", items: [
    "중요한 자료는 반드시 미리 백업해 주세요. 점검·수리 과정에서 저장장치 자료가 지워질 수 있으며, 자료 손실은 책임지기 어렵습니다. 데이터 복구는 별도 서비스입니다.",
    "윈도우 로그인 비밀번호가 있으면 점검을 위해 필요할 수 있습니다. 원하지 않으시면 접수 시 말씀해 주세요.",
    "택배 발송 시 완충재로 충분히 감싸 주시고, 그래픽카드가 큰 PC는 분리해서 보내면 파손 위험이 줄어듭니다. 택배비: 무상 보증 제품도 보내실 때는 선불로 발송해 주세요. 유상 수리는 고객 부담입니다.",
    "수리가 끝난 제품은 완료 연락을 받은 날부터 30일 안에 찾아가 주세요.",
  ] },
];
