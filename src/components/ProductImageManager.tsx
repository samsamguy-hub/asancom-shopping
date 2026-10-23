import { deleteProductImage, replaceProductImage, setMainProductImage, toggleProductImage, uploadProductImage } from "@/app/admin/image-actions";
import ConfirmButton from "@/components/ConfirmButton";
import ImageFileInput from "@/components/ImageFileInput";
import { imageErrorMessages, MAX_IMAGES_PER_PRODUCT, type ImageErrorCode } from "@/lib/image-rules";
import type { Product, ProductImage } from "@/lib/types";
// 관리자 상품 수정 화면의 사진 관리 (서버 액션마다 관리자 권한 재확인 + DB/Storage RLS)
export default function ProductImageManager({product,images,error,saved}:{product:Product,images:ProductImage[],error?:string,saved?:boolean}){
 const hidden=(img?:ProductImage)=><><input type="hidden" name="product_id" value={product.id}/>{img&&<input type="hidden" name="image_id" value={img.id}/>}</>;
 const message=error&&error in imageErrorMessages?imageErrorMessages[error as ImageErrorCode]:error?"사진 처리 중 오류가 발생했습니다.":"";
 return <section className="image-manager"><div><h2>상품 사진</h2><p className="small-muted">JPG·PNG·WEBP, 파일당 5MB 이하, 상품당 최대 {MAX_IMAGES_PER_PRODUCT}장. 첫 번째 사진이 대표 사진입니다. 고객에게는 &lsquo;공개&rsquo; 사진만, 그리고 판매 공개 상품의 사진만 보입니다.</p></div>
 {message&&<p className="compat bad" role="alert">{message}</p>}{saved&&!message&&<p className="compat good">사진 변경이 저장되었습니다.</p>}
 {images.length>0?<div className="image-grid">{images.map((img,i)=><div className="image-item" key={img.id}>
  {img.url?<img src={img.url} alt={img.alt_text||product.name}/>:<div className="image-missing">미리보기 불가</div>}
  <div className="badges">{i===0&&<span className="tiny-badge">대표</span>}<span className={`tiny-badge${img.is_public?"":" alt"}`}>{img.is_public?"공개":"비공개"}</span></div>
  <div className="table-actions">
   <form action={toggleProductImage}>{hidden(img)}<input type="hidden" name="is_public" value={String(img.is_public)}/><button className="link-button">{img.is_public?"비공개로":"공개로"}</button></form>
   {i>0&&<form action={setMainProductImage}>{hidden(img)}<button className="link-button">대표로 지정</button></form>}
   <form action={deleteProductImage}>{hidden(img)}<ConfirmButton className="link-button danger" message="이 사진을 삭제할까요? 되돌릴 수 없습니다.">삭제</ConfirmButton></form>
  </div>
  <form action={replaceProductImage} className="replace-form">{hidden(img)}<ImageFileInput required/><button className="btn secondary small">사진 교체</button></form>
 </div>)}</div>:<div className="empty">등록된 사진이 없습니다.</div>}
 {images.length<MAX_IMAGES_PER_PRODUCT&&<form action={uploadProductImage} className="upload-form">{hidden()}<label>새 사진<ImageFileInput required/></label><label>사진 설명 (선택)<input name="alt_text" maxLength={120} placeholder={product.name}/></label><label className="check"><input type="checkbox" name="is_public" defaultChecked/> 고객에게 공개</label><button className="btn primary" type="submit">사진 업로드</button></form>}
 </section>;
}
