// 사업자 정보 (하단 사업자정보·회사소개·이용약관·개인정보처리방침 공용)
// 전자상거래법 제10조: 상호, 대표자, 주소, 전화, 이메일, 사업자등록번호, 통신판매업 신고번호, 호스팅 제공자를 화면에 표시해야 합니다.
// "[확인 필요]" 값은 고객 화면에 그대로 보이므로 실제 정보로 바꾼 뒤 운영하세요. (사업자등록증·통신판매업 신고증 기준)
export const COMPANY = {
  name: "아산컴마트",
  ceo: "김기정",
  bizNo: "312-25-92973",
  mailOrderNo: "제2026-충남아산-1095호",
  address: "충청남도 아산시 온천대로 1408 (온양고 앞)",
  phone: "041-542-3342",
  email: "samsamguy@naver.com",
  hours: "평일 09:00~19:30, 토·일 10:00~18:30",
  parking: "길 건너 기찻길 공터 (열쇠가게 옆)",
  hosting: "Vercel Inc.",
  // 개인정보 보호책임자 = 대표자 (대표자·전화·이메일을 바꾸면 자동으로 함께 바뀜)
  get privacyOfficer() { return `${this.ceo} (대표)`; },
  get privacyContact() { return `${this.phone} / ${this.email}`; },
  // 약관·처리방침 시행일. 내용을 바꾸면 날짜도 바꾸고 이전 버전을 따로 보관하세요.
  termsDate: "2026년 11월 17일",
  privacyDate: "2026년 11월 17일",
};
// 사업자등록번호 숫자 10자리가 입력된 경우에만 공정거래위원회 사업자정보 확인 링크 표시
export const bizInfoUrl = () => {
  const digits = COMPANY.bizNo.replace(/\D/g, "");
  return digits.length === 10 ? `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${digits}` : null;
};
