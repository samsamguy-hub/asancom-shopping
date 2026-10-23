"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, dbConfigured } from "@/lib/supabase/server";
import { CONTACT_TIMES, ESTIMATE_CATEGORIES, getEstimateParts, normalizePhone, type EstimateParts } from "@/lib/estimates";
// 고객 견적 상담 신청: 누구나 가능. DB 함수(submit_estimate_request)가 게시글 + 연락처를 함께 저장
// 연락처(이름·전화번호·상담시간·요청사항)는 관리자만 볼 수 있는 테이블에 저장되고 게시판에는 '홍**'와 부품만 표시
export type EstimateFormState = { ok: boolean; message: string; no?: number } | null;
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

export async function submitEstimate(_prev: EstimateFormState, formData: FormData): Promise<EstimateFormState> {
  // 자동 등록 프로그램용 숨김 칸이 채워져 있으면 저장하지 않고 성공처럼 응답
  if (str(formData.get("website"))) return { ok: true, message: "견적 상담 신청이 접수되었습니다." };
  if (!dbConfigured()) return { ok: false, message: "DB 연결 후 신청할 수 있습니다." };
  const { byCategory, available } = await getEstimateParts();
  if (!available) return { ok: false, message: "견적 상담 기능 준비 중입니다. 전화로 문의해 주세요." };
  const parts: EstimateParts = {};
  for (const c of ESTIMATE_CATEGORIES) {
    const v = str(formData.get(`part:${c}`));
    if (!v) continue;
    if (!byCategory[c].includes(v)) return { ok: false, message: `${c} 항목이 목록에 없습니다. 새로고침 후 다시 선택하세요.` };
    parts[c] = v;
  }
  if (!Object.keys(parts).length) return { ok: false, message: "부품을 1개 이상 선택하세요." };
  const name = str(formData.get("name")), phone = normalizePhone(str(formData.get("phone"))), message = str(formData.get("message"));
  const timeChoice = str(formData.get("contact_time")), timeOther = str(formData.get("contact_time_other"));
  const contactTime = timeChoice === "직접 입력" ? timeOther : timeChoice;
  if (name.length < 2 || name.length > 20) return { ok: false, message: "이름은 2~20자로 입력하세요." };
  if (!phone) return { ok: false, message: "전화번호를 정확히 입력하세요. (예: 010-1234-5678)" };
  if (!contactTime || contactTime.length > 60 || (timeChoice !== "직접 입력" && !CONTACT_TIMES.includes(timeChoice))) return { ok: false, message: "상담 가능 시간을 선택하거나 60자 이내로 입력하세요." };
  if (message.length > 1000) return { ok: false, message: "요청사항은 1000자 이내로 입력하세요." };
  if ((message.match(/https?:\/\/|www\./gi) || []).length > 1) return { ok: false, message: "링크는 1개까지만 넣을 수 있습니다." };
  if (formData.get("agree") !== "on") return { ok: false, message: "개인정보 수집·이용에 동의해 주세요." };
  const h = await headers();
  if (tooMany(h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local")) return { ok: false, message: "잠시 후 다시 신청해 주세요. (10분에 3건까지)" };
  const db = await createClient();
  const { data, error } = await db.rpc("submit_estimate_request", { p_parts: parts, p_name: name, p_phone: phone, p_contact_time: contactTime, p_message: message });
  if (error) {
    console.error("견적 상담 저장 실패", error.code, error.message);
    return { ok: false, message: "신청을 저장하지 못했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요." };
  }
  revalidatePath("/estimate/board"); revalidatePath("/admin/estimates"); revalidatePath("/admin");
  return { ok: true, message: "견적 상담 신청이 접수되었습니다. 남겨 주신 시간에 연락드리겠습니다.", no: Number(data) };
}
