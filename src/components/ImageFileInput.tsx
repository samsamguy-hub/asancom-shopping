"use client";
import { checkDeclaredImage, IMAGE_ACCEPT, imageErrorMessages } from "@/lib/image-rules";
// 브라우저 사전검사: 5MB 초과·형식 오류 파일은 전송 전에 막음 (최종 검사는 서버와 Supabase)
export default function ImageFileInput({name="photo",required=false}:{name?:string,required?:boolean}){
 return <input type="file" name={name} accept={IMAGE_ACCEPT} required={required} onChange={e=>{const input=e.currentTarget,file=input.files?.[0];const code=file?checkDeclaredImage(file):null;input.setCustomValidity(code?imageErrorMessages[code]:"");if(code)input.reportValidity();}}/>;
}
