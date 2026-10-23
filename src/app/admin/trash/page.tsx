import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import type { Product } from "@/lib/types";
import { formatKRW } from "@/lib/types";
import { deleteProducts, emptyTrash, restoreProducts } from "@/app/admin/actions";
import { BULK_FORM_ID, BulkDeleteBar, SelectAllCheckbox } from "@/components/BulkDelete";
import ConfirmButton from "@/components/ConfirmButton";
export const dynamic="force-dynamic";
const errors:Record<string,string>={none:"상품을 선택하세요.",too_many:"한 번에 200개까지 처리할 수 있습니다.",db:"처리하지 못했습니다. 잠시 후 다시 시도하세요."};
const when=(s:string)=>new Date(s).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"});
export default async function TrashPage({searchParams}:{searchParams:Promise<{restored?:string,deleted?:string,delete_error?:string}>}){
 const db=await requireAdmin();const sp=await searchParams;
 // 관리자는 비공개(휴지통) 상품까지 조회 (RLS: is_admin)
 const {data,error}=await db.from("products").select("*").not("deleted_at","is",null).order("deleted_at",{ascending:false});
 const products=(data||[]) as Product[];
 return <div className="wide section"><Link href="/admin" className="text-link">← 관리자</Link><div className="admin-heading"><div><h1>🗑 상품 휴지통</h1><p>삭제한 상품이 모여 있습니다. 고객 화면에는 보이지 않으며, <strong>복구</strong>하면 삭제 전 공개 상태로 돌아갑니다. <strong>영구 삭제</strong>하면 사진·리뷰까지 지워지고 되돌릴 수 없습니다.</p></div>
  {products.length>0&&<form action={emptyTrash}><ConfirmButton className="btn small danger" message={`휴지통의 상품 ${products.length}개를 모두 영구 삭제할까요?\n사진·리뷰도 함께 삭제되며 되돌릴 수 없습니다.`}>휴지통 비우기</ConfirmButton></form>}</div>
 {error?<p className="compat bad">휴지통 기능을 쓰려면 Supabase SQL Editor에서 supabase/product_trash.sql을 먼저 실행하세요.</p>:<>
 {sp.restored&&<p className="compat good" role="status">상품 {Number(sp.restored)||0}개를 복구했습니다. <Link className="text-link" href="/admin">상품 목록 보기 →</Link></p>}
 {sp.deleted&&<p className="compat good" role="status">상품 {Number(sp.deleted)||0}개를 영구 삭제했습니다.</p>}
 {sp.delete_error&&<p className="compat bad" role="alert">{errors[sp.delete_error]||errors.db}</p>}
 {products.length>0&&<BulkDeleteBar actions={[{action:restoreProducts,label:"선택 복구",confirm:"선택한 상품 {count}개를 복구할까요?"},{action:deleteProducts,label:"선택 영구 삭제",confirm:"선택한 상품 {count}개를 영구 삭제할까요?\n사진·리뷰도 함께 삭제되며 되돌릴 수 없습니다.",danger:true}]}/>}
 <div className="table-wrap"><table className="admin-table"><thead><tr><th className="check-col"><SelectAllCheckbox/></th><th>상품명</th><th>분류</th><th>가격</th><th>삭제 전 상태</th><th>삭제한 날짜</th><th>관리</th></tr></thead><tbody>
  {products.map(p=><tr key={p.id}><td className="check-col"><input type="checkbox" name="ids" value={p.id} form={BULK_FORM_ID} aria-label={`${p.name} 선택`}/></td><td>{p.name}</td><td>{p.category}</td><td>{formatKRW(p.price)}</td><td>{p.deleted_was_active?"공개":"비공개"}</td><td>{p.deleted_at&&when(p.deleted_at)}</td>
   <td><div className="table-actions"><form action={restoreProducts}><input type="hidden" name="ids" value={p.id}/><button className="btn secondary small">복구</button></form>
   <form action={deleteProducts}><input type="hidden" name="ids" value={p.id}/><ConfirmButton className="link-button danger" message={`"${p.name}" 상품을 영구 삭제할까요?\n사진·리뷰도 함께 삭제되며 되돌릴 수 없습니다.`}>영구 삭제</ConfirmButton></form></div></td></tr>)}
 </tbody></table>{products.length===0&&<div className="empty">휴지통이 비어 있습니다.</div>}</div></>}
 </div>;
}
