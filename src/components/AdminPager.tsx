import Link from "next/link";
import { ADMIN_PAGE_SIZE, lastPage } from "@/lib/admin-paging";
// 목록 아래 페이지 넘김: 이전 | 1 | 2 | 3 | 다음 (현재 페이지 색상 표시). 페이지가 많으면 앞뒤 일부만 보이고 … 표시
// 관리자 목록(전체 개수 안내 포함)과 쇼핑몰 상품목록(info=false: 한 페이지뿐이면 숨김, hash: 목록 위치로 이동) 공용
export default function AdminPager({page,total,href,size=ADMIN_PAGE_SIZE,info=true,hash="",label="전체"}:{page:number,total:number,href:(page:number)=>string,size?:number,info?:boolean,hash?:string,label?:string}){
 const pages=lastPage(total,size),from=total?(page-1)*size+1:0,to=Math.min(total,page*size);
 const nums=Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-page)<=2);
 const link=(n:number)=>href(n)+hash;
 if(!info&&pages<=1)return null;
 return <div className="admin-pager">{info&&<p className="pager-info">{label} <strong>{total.toLocaleString("ko-KR")}</strong>개{total>0&&<> · {from}~{to}번째 · {page}/{pages} 페이지</>}</p>}
  {pages>1&&<nav className="pager" aria-label="페이지">
   {page>1?<Link href={link(page-1)}>이전</Link>:<span className="disabled" aria-disabled="true">이전</span>}
   {nums.map((n,i)=><span key={n} className="pager-item">{i>0&&n-nums[i-1]>1&&<span className="gap">…</span>}<Link className={n===page?"active":""} aria-current={n===page?"page":undefined} href={link(n)}>{n}</Link></span>)}
   {page<pages?<Link href={link(page+1)}>다음</Link>:<span className="disabled" aria-disabled="true">다음</span>}
  </nav>}</div>;
}
