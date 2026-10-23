"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, dbConfigured } from "@/lib/supabase/server";
import { CONTACT_TIMES, normalizePhone } from "@/lib/estimate-rules";
import { INQUIRY_SCHEDULES, INQUIRY_TYPES, inquiryBudgets, isInquiryType } from "@/lib/inquiry-rules";
// 홈페이지 제작·앱 개발·창업 문의: 누구나 가능. DB 함수(submit_business_inquiry)로만 저장되며 문의 내용은 관리자만 조회 (RLS)
export type InquiryFormState = { ok: boolean; message: string; no?: number } | null;
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

export async function submitInquiry(_prev: InquiryFormState, formData: FormData): Promise<InquiryFormState> {
  if (str(formData.get("website"))) return { ok: true, message: "문의가 접수되었습니다." };
  if (!dbConfigured()) return { ok: false, message: "DB 연결 후 신청할 수 있습니다." };
  const type = str(formData.get("type"));
  if (!isInquiryType(type)) return { ok: false, message: "문의 종류를 다시 선택해 주세요." };
  const kind = str(formData.get("kind")), name = str(formData.get("name")), company = str(formData.get("company"));
  const phone = normalizePhone(str(formData.get("phone"))), email = str(formData.get("email")).toLowerCase();
  const timeChoice = str(formData.get("contact_time")), contactTime = timeChoice === "직접 입력" ? str(formData.get("contact_time_other")) : timeChoice;
  const budget = str(formData.get("budget")), schedule = str(formData.get("schedule")), content = str(formData.get("content"));
  if (!oneOf(INQUIRY_TYPES[type].kinds as readonly string[], kind)) return { ok: false, message: "문의 내용 구분을 선택하세요." };
  if (name.length < 2 || name.length > 20) return { ok: false, message: "이름은 2~20자로 입력하세요." };
  if (company.length > 40) return { ok: false, message: "회사·상호명은 40자 이내로 입력하세요." };
  if (!phone) return { ok: false, message: "전화번호를 정확히 입력하세요. (예: 010-1234-5678)" };
  if (email && (email.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return { ok: false, message: "이메일 주소를 확인하세요. (없으면 비워 두세요)" };
  if (!contactTime || contactTime.length > 60 || (timeChoice !== "직접 입력" && !CONTACT_TIMES.includes(timeChoice))) return { ok: false, message: "상담 가능 시간을 선택하거나 60자 이내로 입력하세요." };
  if (!oneOf(inquiryBudgets(type), budget)) return { ok: false, message: "예산을 선택하세요." };
  if (!oneOf(INQUIRY_SCHEDULES, schedule)) return { ok: false, message: "희망 일정을 선택하세요." };
  if (content.length < 10 || content.length > 3000) return { ok: false, message: "문의 내용을 10~3000자로 적어 주세요." };
  if ((content.match(/https?:\/\/|www\./gi) || []).length > 3) return { ok: false, message: "링크는 3개까지만 넣을 수 있습니다." };
  if (formData.get("agree") !== "on") return { ok: false, message: "개인정보 수집·이용에 동의해 주세요." };
  const h = await headers();
  if (tooMany(h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local")) return { ok: false, message: "잠시 후 다시 신청해 주세요. (10분에 3건까지)" };
  const db = await createClient();
  const { data, error } = await db.rpc("submit_business_inquiry", {
    p_type: type, p_kind: kind, p_name: name, p_company: company, p_phone: phone, p_email: email,
    p_contact_time: contactTime, p_budget: budget, p_schedule: schedule, p_content: content,
  });
  if (error) {
    console.error("문의 저장 실패", error.code, error.message);
    return { ok: false, message: error.code === "PGRST202" ? "문의 신청 기능 준비 중입니다. 전화로 문의해 주세요." : "신청을 저장하지 못했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요." };
  }
  revalidatePath("/admin/inquiries"); revalidatePath("/admin");
  return { ok: true, message: `${INQUIRY_TYPES[type].label}가 접수되었습니다. 남겨 주신 시간에 담당자가 연락드리겠습니다.`, no: Number(data) };
}
