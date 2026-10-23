"use client";
import { useState } from "react";
// 수량 선택: − / 숫자 / + . 직접 입력 중에는 글자를 그대로 두고, 숫자는 1~max 로 맞춰 반영 (칸을 벗어나면 정리)
export default function QuantityInput({value,max,onChange,disabled,label="수량"}:{value:number,max:number,onChange:(n:number)=>void,disabled?:boolean,label?:string}){
 const [draft,setDraft]=useState<string|null>(null);
 const top=Math.max(1,max),clamp=(n:number)=>Math.max(1,Math.min(Math.floor(n),top));
 return <div className="qty" role="group" aria-label={label}><button type="button" aria-label="수량 줄이기" disabled={disabled||value<=1} onClick={()=>onChange(clamp(value-1))}>−</button><input type="number" inputMode="numeric" min={1} max={top} value={draft??String(value)} disabled={disabled} aria-label={label} onChange={e=>{const text=e.currentTarget.value,n=Number(text);setDraft(text);if(text!==""&&Number.isFinite(n))onChange(clamp(n));}} onBlur={()=>setDraft(null)}/><button type="button" aria-label="수량 늘리기" disabled={disabled||value>=top} onClick={()=>onChange(clamp(value+1))}>+</button></div>;
}
