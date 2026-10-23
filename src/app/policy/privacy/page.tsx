import type { Metadata } from "next";
import PolicyDoc from "@/components/PolicyDoc";
import { COMPANY } from "@/lib/company";
import { PRIVACY } from "@/lib/legal";
export const metadata:Metadata={title:"개인정보처리방침 | 아산컴마트"};
export default function Privacy(){return <PolicyDoc eyebrow="PRIVACY POLICY" title="개인정보처리방침" intro={`${COMPANY.name}는 개인정보 보호법에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위해 다음과 같이 개인정보처리방침을 공개합니다.`} date={COMPANY.privacyDate} sections={PRIVACY}/>}
