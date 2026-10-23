"use client";
import { useRef, useState } from "react";
// 우편번호·주소·상세 주소 입력칸 + 우편번호 찾기(카카오 우편번호 서비스, 무료·키 없음). 스크립트는 버튼을 누를 때만 불러옴
// 검색이 안 되는 환경(차단 등)에서도 주소를 직접 입력할 수 있음
const POSTCODE_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
type PostcodeData = { zonecode: string; roadAddress: string; jibunAddress: string; buildingName: string; apartment: "Y" | "N"; bname: string };
type DaumPostcode = { Postcode: new (o: { oncomplete: (d: PostcodeData) => void }) => { open: () => void } };
let loading: Promise<void> | null = null;
function loadPostcode() {
  const w = window as unknown as { daum?: DaumPostcode };
  if (w.daum?.Postcode) return Promise.resolve();
  if (!loading) loading = new Promise((resolve, reject) => {
    const s = document.createElement("script"); s.src = POSTCODE_SRC; s.async = true;
    s.onload = () => resolve(); s.onerror = () => { loading = null; reject(new Error("load")); };
    document.head.appendChild(s);
  });
  return loading;
}
export default function AddressFields({defaults,required=false}:{defaults?:{zipcode?:string,address1?:string,address2?:string},required?:boolean}){
 const [zip,setZip]=useState(defaults?.zipcode||"");const [addr,setAddr]=useState(defaults?.address1||"");const [error,setError]=useState("");
 const detail=useRef<HTMLInputElement>(null);
 async function search(){setError("");
  try{await loadPostcode();const daum=(window as unknown as {daum:DaumPostcode}).daum;
   new daum.Postcode({oncomplete:d=>{
    // 도로명 주소 + (동·건물명) 참고 항목
    const extra=[d.bname&&/[동로가]$/.test(d.bname)?d.bname:"",d.buildingName&&d.apartment==="Y"?d.buildingName:""].filter(Boolean).join(", ");
    setZip(d.zonecode);setAddr((d.roadAddress||d.jibunAddress)+(extra?` (${extra})`:""));setTimeout(()=>detail.current?.focus(),50);}}).open();
  }catch{setError("우편번호 검색을 불러오지 못했습니다. 주소를 직접 입력해 주세요.");}}
 return <><label>우편번호<span className="zip-row"><input name="zipcode" maxLength={10} inputMode="numeric" autoComplete="postal-code" value={zip} onChange={e=>setZip(e.target.value)} placeholder="31500"/><button type="button" className="btn secondary small" onClick={search}>우편번호 찾기</button></span></label>
  <label>주소{required&&" *"}<input name="address1" required={required} minLength={required?2:undefined} maxLength={200} autoComplete="address-line1" value={addr} onChange={e=>setAddr(e.target.value)} placeholder="우편번호 찾기를 누르거나 직접 입력"/></label>
  <label>상세 주소<input ref={detail} name="address2" maxLength={200} autoComplete="address-line2" defaultValue={defaults?.address2||""} placeholder="동·호수"/></label>
  {error&&<p className="compat warn" role="alert">{error}</p>}</>;
}
