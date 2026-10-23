import type { Metadata } from "next";
import PolicyDoc from "@/components/PolicyDoc";
import { COMPANY } from "@/lib/company";
import { TERMS } from "@/lib/legal";
export const metadata:Metadata={title:"이용약관 | 아산컴마트"};
export default function Terms(){return <PolicyDoc eyebrow="TERMS OF SERVICE" title="이용약관" intro={`${COMPANY.name} 쇼핑몰 이용에 관한 약관입니다.`} date={COMPANY.termsDate} sections={TERMS}/>}
