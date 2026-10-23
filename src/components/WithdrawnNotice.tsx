"use client";
import { useSearchParams } from "next/navigation";
// 회원 탈퇴 직후 메인으로 돌아왔을 때(?withdrawn=1) 안내. 브라우저에서 주소를 읽어 메인 페이지는 캐시 그대로 사용
export default function WithdrawnNotice(){
 return useSearchParams().get("withdrawn")==="1"?<div className="wide notice">회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.</div>:null;
}
