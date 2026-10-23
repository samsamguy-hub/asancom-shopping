"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { categories } from "@/lib/types";
import { addImage, ImageError, validateImage, type ValidImage } from "@/lib/images";
import { IMAGE_BUCKET, imageErrorMessages, type ImageErrorCode } from "@/lib/image-rules";
import { coerceSpecValue, SPEC_FIELDS } from "@/lib/specs";
import { checkListPrice, parseBadges, splitUsedBadge } from "@/lib/product-status";
function string(v:FormDataEntryValue|null){return typeof v==="string"?v.trim():"";}
// sold_out·badges·list_price 열이 아직 없을 때(SQL 미적용) 안내
const missingColumnHint=(e:{code?:string,message:string})=>/list_price/.test(e.message)?"Supabase에서 supabase/product_list_price.sql을 먼저 실행하세요. ":e.code==="PGRST204"||/sold_out|badges/.test(e.message)?"Supabase에서 supabase/product_badges.sql을 먼저 실행하세요. ":"";
const refreshShop=()=>{revalidatePath("/");revalidatePath("/products");revalidatePath("/products/[slug]","page");revalidatePath("/builder");revalidatePath("/admin");};
// 상품 등록·수정. 입력을 최대한 알아서 정리해 저장하고(오류 화면 없음), 저장하지 못한 칸만 알려줌
// - 상품 URL 이름: 비우거나 한글·특수문자를 넣어도 자동으로 만들고, 겹치면 뒤에 글자를 붙임
// - 가격·재고: "1,000,000원", "3개"처럼 써도 숫자만 사용
// - 사양: "600W", "2.5슬롯", "있음"도 인식. 끝내 알아볼 수 없는 칸만 빼고 저장
// - 정상가가 판매가 이하: 할인 표시 없이 저장. 새 열(SQL 미적용)이 없으면 그 값만 빼고 저장
export type SaveProductState={error?:string}|null;
const slugify=(v:string)=>v.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
const randomSlug=()=>`p-${crypto.randomUUID().slice(0,8)}`;
function lenientInt(v:FormDataEntryValue|null,max:number):number|null{
 const s=string(v).normalize("NFKC").replace(/[,\s원개₩]/g,"");
 if(!s)return null;
 const m=s.match(/^\d+(\.\d+)?$/)||s.match(/\d+(\.\d+)?/);
 if(!m)return null;
 const n=Math.round(Number(m[0]));
 return Number.isSafeInteger(n)&&n>=0&&n<=max?n:null;
}
export async function saveProduct(_prev:SaveProductState,formData:FormData):Promise<SaveProductState> {
 const db=await requireAdmin();
 const warnings:string[]=[];
 const id=string(formData.get("id"));
 if(id&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))return {error:"상품 정보를 찾을 수 없습니다. 목록에서 다시 열어 주세요."};
 // 상품명: 앞뒤 공백·줄바꿈 정리, 160자 넘으면 자름 (DB 규칙: 2~160자)
 let name=string(formData.get("name")).replace(/\s+/g," ");
 if(name.length>160){name=name.slice(0,160);warnings.push("상품명이 길어 160자까지만 저장했습니다");}
 if(name.length<2)return {error:"상품명을 2글자 이상 입력하세요."};
 const category=string(formData.get("category"));
 if(!categories.includes(category as typeof categories[number]))return {error:"카테고리를 선택하세요."};
 const description=string(formData.get("description")).slice(0,2000);
 // 사양: 알아볼 수 없는 칸만 빼고 저장
 const specs:Record<string,string|number|boolean>={};
 for(const field of SPEC_FIELDS){const val=coerceSpecValue(field,string(formData.get(field.key)));if(val===undefined)continue;if(typeof val==="object"){warnings.push(`${field.label}: 형식을 알 수 없어 저장하지 않음 (${val.error})`);continue;}specs[field.key]=val;}
 const badges=parseBadges(formData.getAll("badges").filter((v):v is string=>typeof v==="string"));
 const usedBadge=splitUsedBadge("error" in badges?[]:badges);
 const price=lenientInt(formData.get("price"),1000000000);
 if(price===null)return {error:"판매가를 숫자로 입력하세요. (예: 1,290,000)"};
 let stock=lenientInt(formData.get("stock"),1000000);
 if(stock===null){stock=0;if(string(formData.get("stock")))warnings.push("재고 수량을 알 수 없어 0개로 저장했습니다");}
 let list_price=string(formData.get("list_price"))?lenientInt(formData.get("list_price"),1000000000):null;
 if(string(formData.get("list_price"))&&list_price===null)warnings.push("정상가를 알 수 없어 저장하지 않았습니다");
 if(list_price!==null&&checkListPrice(list_price,price)){list_price=null;warnings.push("정상가가 판매가보다 높지 않아 할인 표시 없이 저장했습니다");}
 // 상품 URL 이름: 영문 소문자·숫자·- 로 자동 정리. 비우면 새 상품은 자동 생성, 수정 시에는 기존 값 유지
 let slug=slugify(string(formData.get("slug")));
 if(slug.length<3)slug=id?"":randomSlug();
 const payload:Record<string,unknown>={name,category,description,price,list_price,stock,is_used:formData.get("is_used")==="on"||usedBadge.used,active:formData.get("active")==="on",sold_out:formData.get("sold_out")==="on",badges:usedBadge.badges,specs};
 if(slug)payload.slug=slug;
 // 휴지통 상품을 수정하면 판매중지 유지 (공개 여부는 복구할 때 적용)
 if(id){const cur=await db.from("products").select("*").eq("id",id).maybeSingle();if(!cur.error&&!cur.data)return {error:"상품을 찾을 수 없습니다. 이미 영구 삭제되었을 수 있습니다. 목록에서 다시 열어 주세요."};if(cur.data?.deleted_at){payload.deleted_was_active=payload.active;payload.active=false;warnings.push("휴지통에 있는 상품이라 고객에게 보이지 않습니다. 판매 공개 설정은 휴지통에서 복구할 때 적용됩니다");}}
 // 새 상품 대표 사진: 사진에 문제가 있으면 상품만 저장하고 수정 화면에서 다시 올리도록 안내
 let photo:ValidImage|null=null,photoError:ImageErrorCode|undefined;
 if(!id){try{photo=await validateImage(formData.get("photo"));}catch(e){photoError=e instanceof ImageError?e.code:"upload";}}
 const save=()=>id?db.from("products").update(payload).eq("id",id).select("id").single():db.from("products").insert(payload).select("id").single();
 let result=await save();
 for(let tries=0;result.error&&tries<5;tries++){
  const e=result.error;
  // URL 이름이 다른 상품과 겹침 → 뒤에 글자를 붙여 다시 저장
  if(e.code==="23505"&&/slug/.test(e.message)){payload.slug=`${(payload.slug as string||slugify(name)||"p").slice(0,80)}-${crypto.randomUUID().slice(0,4)}`.replace(/^-/,"");if(!tries)warnings.push(`상품 URL 이름이 다른 상품과 겹쳐 '${payload.slug}'로 저장했습니다`);result=await save();continue;}
  // SQL 미적용으로 없는 열 → 그 값만 빼고 저장
  const missing=(["sold_out","badges","list_price","deleted_was_active"] as const).find(c=>c in payload&&e.message.includes(c));
  if(e.code==="PGRST204"&&missing){delete payload[missing];if(missing!=="deleted_was_active")warnings.push(`${missing==="list_price"?"정상가":"품절·배지"}는 저장하지 않았습니다 (${missingColumnHint(e).trim()||"Supabase SQL 적용 필요"})`);result=await save();continue;}
  // 배지 허용 목록이 DB에 아직 옛 버전('중고' 없음) → 새 배지만 빼고 저장
  if(e.code==="23514"&&/badges/.test(e.message)&&Array.isArray(payload.badges)&&(payload.badges as string[]).length){const old=["인기","임박","NEW","특가","한정수량"];const list=payload.badges as string[];const dropped=list.filter(b=>!old.includes(b));payload.badges=dropped.length?list.filter(b=>old.includes(b)).slice(0,5):[];warnings.push(`배지 ${dropped.join(", ")||"선택"}는 저장하지 않았습니다 (Supabase에서 supabase/product_badges.sql을 다시 실행하세요)`);result=await save();continue;}
  break;
 }
 if(result.error){
  console.error("상품 저장 실패",result.error.code,result.error.message);
  const e=result.error;
  return {error:e.code==="23514"&&/category/.test(e.message)?"이 카테고리는 아직 DB에 없습니다. Supabase에서 supabase/builder_specs.sql을 실행하세요."
   :e.code==="23514"?`DB 규칙에 맞지 않는 값이 있습니다. 상품명(2~160자)과 가격·재고를 확인하세요. (${e.message})`
   :e.code==="PGRST116"?"상품을 찾을 수 없습니다. 이미 영구 삭제되었거나 관리자 로그인이 끊겼을 수 있습니다. 목록에서 다시 열어 주세요."
   :e.code==="42501"?"관리자 권한이 확인되지 않았습니다. 다시 로그인해 주세요."
   :"저장하지 못했습니다. 잠시 후 다시 시도하세요. ("+e.message+")"};
 }
 const savedId=result.data.id as string;
 if(photo){try{await addImage(db,savedId,photo,formData.get("photo_public")==="on",null);}catch(e){photoError=e instanceof ImageError?e.code:"upload";}}
 refreshShop();
 // 상품은 저장됨. 빠진 칸이나 사진 문제가 있으면 수정 화면에서 알려줌
 if(photoError||warnings.length){const q=new URLSearchParams({saved:"1"});if(photoError)q.set("image_error",photoError);if(warnings.length)q.set("warn",warnings.join("\n").slice(0,1500));redirect(`/admin/products/${savedId}?${q}`);}
 redirect("/admin");
}
export async function toggleProduct(formData:FormData){
 const db=await requireAdmin();const id=string(formData.get("id")),active=string(formData.get("active"))==="true";
 if(!/^[0-9a-f-]{36}$/.test(id))throw new Error("상품 ID 오류");
 const {error}=await db.from("products").update({active:!active}).eq("id",id);
 if(error)throw new Error(error.message);
 refreshShop();
}
// 관리자 목록에서 바로 품절 지정·해제 (재고 수량은 그대로 둠)
export async function toggleSoldOut(formData:FormData){
 const db=await requireAdmin();const id=string(formData.get("id")),soldOut=string(formData.get("sold_out"))==="true";
 if(!/^[0-9a-f-]{36}$/.test(id))throw new Error("상품 ID 오류");
 const {error}=await db.from("products").update({sold_out:!soldOut}).eq("id",id);
 if(error)throw new Error(missingColumnHint(error)+error.message);
 refreshShop();
}
// 상품 휴지통 (supabase/product_trash.sql). 선택한 상품 id 목록 읽기 (개별·선택 공용, 한 번에 최대 200개)
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function selectedIds(formData:FormData,back:string){
 const ids=[...new Set(formData.getAll("ids").map(string))].filter(id=>uuidRe.test(id));
 if(!ids.length)redirect(`${back}?delete_error=none`);
 if(ids.length>200)redirect(`${back}?delete_error=too_many`);
 return ids;
}
const trashSqlMissing=(e:{code?:string,message:string})=>e.code==="PGRST204"||/deleted_at|deleted_was_active/.test(e.message);
// 휴지통으로 이동: 판매중지(active=false)로 바꿔 고객 화면에서 숨기고, 원래 공개 여부를 기억해 둠
export async function moveProductsToTrash(formData:FormData){
 const db=await requireAdmin();const ids=selectedIds(formData,"/admin");
 const now=new Date().toISOString();let moved=0;
 for(const wasActive of [true,false]){
  const {data,error}=await db.from("products").update({deleted_at:now,deleted_was_active:wasActive,active:false}).in("id",ids).eq("active",wasActive).is("deleted_at",null).select("id");
  if(error){console.error("휴지통 이동 실패",error.message);redirect(`/admin?delete_error=${trashSqlMissing(error)?"sql":"db"}`);}
  moved+=data?.length||0;
 }
 refreshShop();revalidatePath("/admin/trash");
 redirect(`/admin?trashed=${moved}`);
}
// 복구: 휴지통에서 꺼내 원래 공개 여부로 되돌림
export async function restoreProducts(formData:FormData){
 const db=await requireAdmin();const ids=selectedIds(formData,"/admin/trash");let restored=0;
 for(const wasActive of [true,false]){
  const {data,error}=await db.from("products").update({deleted_at:null,active:wasActive}).in("id",ids).eq("deleted_was_active",wasActive).not("deleted_at","is",null).select("id");
  if(error){console.error("상품 복구 실패",error.message);redirect("/admin/trash?delete_error=db");}
  restored+=data?.length||0;
 }
 refreshShop();revalidatePath("/admin/trash");
 redirect(`/admin/trash?restored=${restored}`);
}
// 영구 삭제: 휴지통에 있는 상품만. 되돌릴 수 없음
// 순서: 사진 기록 삭제(상품 삭제를 막는 연결) → 상품 삭제(리뷰는 DB에서 함께 삭제) → 저장소 사진 파일 삭제
async function purge(db:Awaited<ReturnType<typeof requireAdmin>>,requested:string[]){
 const {data:trashed,error:te}=await db.from("products").select("id").in("id",requested).not("deleted_at","is",null);
 if(te){console.error("휴지통 조회 실패",te.message);redirect("/admin/trash?delete_error=db");}
 const ids=(trashed||[]).map(r=>r.id as string);
 if(!ids.length)return 0;
 const imgs=await db.from("product_images").select("storage_path").in("product_id",ids);
 const tableMissing=imgs.error&&["PGRST205","42P01"].includes(imgs.error.code||"");
 if(imgs.error&&!tableMissing){console.error("상품사진 조회 실패",imgs.error.message);redirect("/admin/trash?delete_error=db");}
 const paths=(imgs.data||[]).map(r=>r.storage_path as string);
 if(paths.length){
  const {error}=await db.from("product_images").delete().in("product_id",ids);
  if(error){console.error("상품사진 기록 삭제 실패",error.message);redirect("/admin/trash?delete_error=db");}
 }
 const {data,error}=await db.from("products").delete().in("id",ids).not("deleted_at","is",null).select("id");
 if(error){console.error("상품 삭제 실패",error.message);redirect("/admin/trash?delete_error=db");}
 // 파일 삭제 실패는 고객에게 보이지 않으므로(기록이 이미 없음) 기록만 남김
 if(paths.length){const {error:se}=await db.storage.from(IMAGE_BUCKET).remove(paths);if(se)console.error("상품사진 파일 삭제 실패",se.message);}
 return data?.length||0;
}
export async function deleteProducts(formData:FormData){
 const db=await requireAdmin();const count=await purge(db,selectedIds(formData,"/admin/trash"));
 refreshShop();revalidatePath("/admin/trash");
 redirect(`/admin/trash?deleted=${count}`);
}
// 휴지통 비우기: 휴지통 상품 전체 영구 삭제 (200개씩)
export async function emptyTrash(){
 const db=await requireAdmin();
 const {data,error}=await db.from("products").select("id").not("deleted_at","is",null).limit(200);
 if(error){console.error("휴지통 조회 실패",error.message);redirect("/admin/trash?delete_error=db");}
 const count=await purge(db,(data||[]).map(r=>r.id as string));
 refreshShop();revalidatePath("/admin/trash");
 redirect(`/admin/trash?deleted=${count}`);
}
