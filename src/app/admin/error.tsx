"use client";
import Link from "next/link";
// 관리자 화면 오류 안내. 프로그램을 새로 고친 뒤 예전에 열어 둔 화면에서 저장하면 "Server Action not found" 오류가 나므로 새로고침을 안내
export default function AdminError({error,reset}:{error:Error&{digest?:string},reset:()=>void}){
 const stale=/server action/i.test(error.message);
 return <div className="wide section narrow"><Link href="/admin" className="text-link">← 관리자</Link><h1>처리 중 문제가 생겼습니다</h1>
 <p className="compat bad" role="alert">{stale?"화면이 오래되어 저장하지 못했습니다. 새로고침(F5) 후 다시 저장해 주세요.":"잠시 후 다시 시도해 주세요. 계속되면 새로고침(F5) 후 관리자 로그인을 확인하세요."}</p>
 <div className="admin-actions"><button className="btn primary" onClick={()=>window.location.reload()}>새로고침</button><button className="btn secondary" onClick={reset}>다시 시도</button><Link className="btn secondary" href="/admin">관리자 홈</Link></div></div>;
}
