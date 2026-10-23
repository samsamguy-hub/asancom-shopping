import Link from "next/link";
import { notFound } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import ProductImageManager from "@/components/ProductImageManager";
import { requireAdmin } from "@/lib/admin";
import { IMAGE_COLUMNS, signImages, sortImages } from "@/lib/images";
import type { Product, ProductImage } from "@/lib/types";
export const dynamic="force-dynamic";
export default async function EditProduct({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{image_error?:string,image_saved?:string,saved?:string,warn?:string}>}){const {id}=await params;const sp=await searchParams;const db=await requireAdmin();const {data,error}=await db.from("products").select("*").eq("id",id).maybeSingle();if(error||!data)notFound();
 // 관리자는 비공개 사진까지 모두 조회 (RLS: is_admin)
 const imageResult=await db.from("product_images").select(IMAGE_COLUMNS).eq("product_id",id);
 const images=imageResult.error?[]:await signImages(db,sortImages((imageResult.data||[]) as unknown as ProductImage[]));
 return <div className="wide section narrow"><Link href="/admin" className="text-link">← 관리자</Link><h1>상품 수정</h1>{sp.saved&&<div className="compat good" role="status"><strong>상품을 저장했습니다.</strong>{sp.warn&&<><p>아래 내용은 자동으로 정리했거나 저장하지 않았습니다. 필요하면 고쳐서 다시 저장하세요.</p><ul>{sp.warn.split("\n").slice(0,20).map((w,i)=><li key={i}>{w}</li>)}</ul></>}</div>}<ProductForm key={String(data.updated_at||"")} product={data as Product}/>{imageResult.error?<p className="compat bad">상품 사진 기능을 쓰려면 Supabase에서 supabase/product_images.sql을 먼저 실행하세요.</p>:<ProductImageManager product={data as Product} images={images} error={sp.image_error} saved={sp.image_saved==="1"}/>}</div>}
