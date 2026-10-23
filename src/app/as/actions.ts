"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, dbConfigured } from "@/lib/supabase/server";
import { CONTACT_TIMES, normalizePhone } from "@/lib/estimate-rules";
import { AS_PRODUCT_TYPES, AS_PURCHASE_PLACES, AS_RECEIPT_METHODS, AS_SYMPTOMS } from "@/lib/as-rules";
// 고객 A/S 신청: 누구나 가능. DB 함수(submit_as_request)로만 저장되며 신청 내용은 관리자만 조회 (RLS)
export type AsFormState = { ok: boolean; message: string; no?: number } | null;
// 연속 신청 제한: 같은 접속지에서 10분에 3건 (서버 1대 기준 보조 수단)
const recent = new Map<string, number[]>();
function tooMany(key: string) {
  const now = Date.now(), list = (recent.get(key) || []).filter(t => now - t < 10 * 60_000);
  if (list.length >= 3) { recent.set(key, list); return true; }
  recent.set(key, [...list, now]);
  if (recent.size > 5000) recent.clear();
  return false;
}
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
const oneOf = (list: readonly string[], v: string) => list.includes(v);

export async function submitAs(_prev: AsFormState, formData: FormData): Promise<AsFormState> {
  if (str(formData.get("website"))) return { ok: true, message: "A/S 신청이 접수되었습니다." };
  if (!dbConfigured()) return { ok: false, message: "DB 연결 후 신청할 수 있습니다." };
  const name = str(formData.get("name")), phone = normalizePhone(str(formData.get("phone")));
  const timeChoice = str(formData.get("contact_time")), contactTime = timeChoice === "직접 입력" ? str(formData.get("contact_time_other")) : timeChoice;
  const productType = str(formData.get("product_type")), purchasePlace = str(formData.get("purchase_place")), purchaseDate = str(formData.get("purchase_date"));
  const symptomType = str(formData.get("symptom_type")), symptom = str(formData.get("symptom"));
  const receiptMethod = str(formData.get("receipt_method")), visitAddress = receiptMethod === "출장 방문 요청" ? str(formData.get("visit_address")) : "";
  if (name.length < 2 || name.length > 20) return { ok: false, message: "이름은 2~20자로 입력하세요." };
  if (!phone) return { ok: false, message: "전화번호를 정확히 입력하세요. (예: 010-1234-5678)" };
  if (!contactTime || contactTime.length > 60 || (timeChoice !== "직접 입력" && !CONTACT_TIMES.includes(timeChoice))) return { ok: false, message: "상담 가능 시간을 선택하거나 60자 이내로 입력하세요." };
  if (!oneOf(AS_PRODUCT_TYPES, productType)) return { ok: false, message: "제품 종류를 선택하세요." };
  if (!oneOf(AS_PURCHASE_PLACES, purchasePlace)) return { ok: false, message: "구매처를 선택하세요." };
  if (purchaseDate.length > 30) return { ok: false, message: "구매 시기는 30자 이내로 입력하세요." };
  if (!oneOf(AS_SYMPTOMS, symptomType)) return { ok: false, message: "증상 종류를 선택하세요." };
  if (symptom.length < 5 || symptom.length > 2000) return { ok: false, message: "증상을 5~2000자로 적어 주세요." };
  if ((symptom.match(/https?:\/\/|www\./gi) || []).length > 1) return { ok: false, message: "링크는 1개까지만 넣을 수 있습니다." };
  if (!oneOf(AS_RECEIPT_METHODS, receiptMethod)) return { ok: false, message: "접수 방법을 선택하세요." };
  if (receiptMethod === "출장 방문 요청" && (visitAddress.length < 2 || visitAddress.length > 120)) return { ok: false, message: "출장 방문 주소를 120자 이내로 입력하세요." };
  if (formData.get("agree") !== "on") return { ok: false, message: "개인정보 수집·이용에 동의해 주세요." };
  if (formData.get("backup") !== "on") return { ok: false, message: "자료 백업 안내를 확인해 주세요." };
  const h = await headers();
  if (tooMany(h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local")) return { ok: false, message: "잠시 후 다시 신청해 주세요. (10분에 3건까지)" };
  const db = await createClient();
  const { data, error } = await db.rpc("submit_as_request", {
    p_name: name, p_phone: phone, p_contact_time: contactTime, p_product_type: productType, p_purchase_place: purchasePlace, p_purchase_date: purchaseDate,
    p_symptom_type: symptomType, p_symptom: symptom, p_receipt_method: receiptMethod, p_visit_address: visitAddress,
  });
  if (error) {
    console.error("A/S 신청 저장 실패", error.code, error.message);
    return { ok: false, message: error.code === "PGRST202" ? "A/S 신청 기능 준비 중입니다. 전화로 접수해 주세요." : "신청을 저장하지 못했습니다. 잠시 후 다시 시도하거나 전화로 접수해 주세요." };
  }
  revalidatePath("/admin/as"); revalidatePath("/admin");
  return { ok: true, message: "A/S 신청이 접수되었습니다. 남겨 주신 시간에 담당자가 연락드리겠습니다.", no: Number(data) };
}
