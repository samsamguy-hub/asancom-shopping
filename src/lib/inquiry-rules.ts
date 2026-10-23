// 홈페이지 제작·앱 개발·창업 문의 공용 규칙 (고객 폼·서버·관리자 공용, 서버 전용 코드 없음). 선택지는 supabase/business_inquiries.sql 의 제약과 같아야 함
export const INQUIRY_TYPES = {
  web: {
    label: "홈페이지 제작 문의", short: "홈페이지 제작", icon: "🌐", eyebrow: "WEBSITE",
    intro: "회사·매장 홈페이지, 쇼핑몰 제작과 리뉴얼, 유지보수를 상담해 드립니다.",
    kinds: ["신규 홈페이지 제작", "쇼핑몰 제작", "기존 홈페이지 리뉴얼", "유지보수·수정", "기타"],
    placeholder: "예) 컴퓨터 매장 홈페이지를 만들고 싶습니다. 상품 소개, 지도, 문의 게시판이 필요하고 휴대폰에서도 잘 보였으면 합니다. 참고하는 사이트: www.example.com",
  },
  app: {
    label: "앱 개발 문의", short: "앱 개발", icon: "📱", eyebrow: "APP",
    intro: "안드로이드·아이폰 앱, 모바일 웹앱 개발과 기존 앱 수정을 상담해 드립니다.",
    kinds: ["안드로이드 앱", "아이폰 앱", "안드로이드+아이폰", "모바일 웹앱", "기존 앱 수정·유지보수", "기타"],
    placeholder: "예) 매장 예약과 포인트 적립이 되는 앱을 만들고 싶습니다. 회원가입, 예약 알림, 관리자 화면이 필요합니다.",
  },
  startup: {
    label: "컴퓨터매장 창업 문의", short: "컴퓨터매장 창업", icon: "🏪", eyebrow: "STARTUP",
    intro: "컴퓨터 매장 창업 준비부터 상품 구성, 조립·수리 운영 노하우까지 상담해 드립니다.",
    kinds: ["컴퓨터매장 창업 문의"],
    budgets: ["1천만원 이내", "3천만원 이내", "5천만원 이상"],
    placeholder: "예) 아산 지역에 컴퓨터 매장 창업을 준비하고 있습니다. 매장 규모는 15평 정도이고, 초기 상품 구성과 대략적인 비용이 궁금합니다.",
  },
} as const;
export type InquiryType = keyof typeof INQUIRY_TYPES;
export const isInquiryType = (v: string): v is InquiryType => Object.prototype.hasOwnProperty.call(INQUIRY_TYPES, v);
export const INQUIRY_BUDGETS = ["미정 (상담 후 결정)", "300만원 미만", "300만~1,000만원", "1,000만~3,000만원", "3,000만원 이상"] as const;
// 예산 선택지: 문의 종류에 따로 정한 목록이 있으면 그것을, 없으면 공통 목록 사용
export const inquiryBudgets = (type: InquiryType): readonly string[] => { const t = INQUIRY_TYPES[type]; return "budgets" in t ? t.budgets : INQUIRY_BUDGETS; };
export const INQUIRY_SCHEDULES = ["최대한 빨리", "1개월 이내", "1~3개월", "3개월 이후", "미정"] as const;
export const INQUIRY_STATUS = { received: "접수", consulting: "상담중", done: "상담완료", canceled: "취소" } as const;
export type InquiryStatus = keyof typeof INQUIRY_STATUS;
export type BusinessInquiry = { id: string; inquiry_no: number; inquiry_type: InquiryType; kind: string; customer_name: string; company: string; phone: string; email: string; contact_time: string; budget: string; schedule: string; content: string; status: InquiryStatus; admin_memo: string | null; created_at: string };
export const INQUIRY_STEPS = [
  { title: "문의 신청", text: "아래 신청서 작성 또는 전화 문의" },
  { title: "상담 연락", text: "담당자가 남긴 시간에 연락" },
  { title: "내용 확인", text: "필요한 기능·규모·일정 확인" },
  { title: "견적·제안", text: "비용과 진행 방법 안내" },
  { title: "계약·진행", text: "동의하신 뒤 진행" },
];
