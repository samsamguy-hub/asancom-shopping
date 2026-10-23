import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/PasswordForms";
export const metadata:Metadata={title:"비밀번호 변경 | 아산컴마트"};
export default function NewPasswordPage(){
 return <div className="wide section login-wrap"><span className="eyebrow blue">PASSWORD</span><h1>새 비밀번호 설정</h1><p>새로 사용할 비밀번호를 입력하세요.</p><NewPasswordForm/></div>;
}
