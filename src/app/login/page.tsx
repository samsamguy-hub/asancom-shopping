import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { dbConfigured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/order-rules";
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string,next?:string}>}){
 const {error,next}=await searchParams;const to=next?safeNext(next,""):"";
 const admin=to.startsWith("/admin")||error==="permission"||error==="setup";
 return <div className="wide section login-wrap"><span className="eyebrow blue">{admin?"ASAN COMMART ADMIN":"ASAN COMMART"}</span><h1>{admin?"관리자 로그인":"로그인"}</h1><p>{admin?"상품 등록과 재고 수정은 승인된 관리자만 가능합니다.":"아산컴마트 회원 로그인"}</p>
 {error==="permission"&&<p className="compat bad">이 계정에는 관리자 권한이 없습니다. Supabase admins 테이블을 확인하세요.</p>}{error==="setup"&&<p className="compat bad">.env.local 연결 정보부터 설정하세요.</p>}
 {error==="auth"&&<p className="compat bad">인증 링크가 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요.</p>}
 <LoginForm configured={dbConfigured()} next={to||null} admin={admin}/>
 {!admin&&<p className="login-links"><Link className="text-link" href={`/signup${to?`?next=${encodeURIComponent(to)}`:""}`}>회원가입</Link><span aria-hidden="true">·</span><Link className="text-link" href="/forgot-password">비밀번호 찾기</Link><span aria-hidden="true">·</span><Link className="text-link" href="/order/lookup">비회원 주문조회</Link></p>}</div>}
