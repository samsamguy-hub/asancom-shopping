"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { buildPlan, CsvFileError, parseCsv, readCsvFile, validateRows, type ExistingProduct, type ImportMode, type ImportPlan, type PlanRow } from "@/lib/csv-import";

// 브라우저로 돌려보내는 값: 화면 표시에 필요한 것만 (DB 원본 행·id 제외)
export type CsvPreview = { ok: boolean; message?: string; encoding?: string; mode: ImportMode; rows: PlanRow[]; summary?: ImportPlan["summary"]; token?: string };
export type CsvApplyResult = { ok: boolean; message: string; inserted?: number; updated?: number };

// 미리보기와 반영이 같은 검사를 거침. 관리자 세션으로 조회하므로 RLS상 비공개 상품까지 비교됨
async function makePlan(formData: FormData) {
  const db = await requireAdmin();
  const mode: ImportMode = formData.get("mode") === "upsert" ? "upsert" : "insert";
  const { text, encoding } = await readCsvFile(formData.get("file"));
  const { rows } = validateRows(parseCsv(text));
  const slugs = [...new Set(rows.map(r => r.values.slug).filter((s): s is string => typeof s === "string"))];
  const existing = new Map<string, ExistingProduct>();
  for (let i = 0; i < slugs.length; i += 200) {
    const { data, error } = await db.from("products").select("*").in("slug", slugs.slice(i, i + 200));
    if (error) throw new Error("기존 상품 조회 실패: " + error.message);
    for (const p of (data || []) as ExistingProduct[]) existing.set(p.slug, p);
  }
  return { db, mode, encoding, plan: buildPlan(rows, existing, mode) };
}

export async function previewProductCsv(formData: FormData): Promise<CsvPreview> {
  const mode: ImportMode = formData.get("mode") === "upsert" ? "upsert" : "insert";
  try {
    const { encoding, plan } = await makePlan(formData);
    return { ok: plan.summary.error === 0, encoding, mode, rows: plan.rows, summary: plan.summary, token: plan.token,
      message: plan.summary.error ? `오류가 있는 행이 ${plan.summary.error}개 있습니다. CSV를 고친 뒤 다시 미리보기 하세요.` : undefined };
  } catch (e) {
    if (e instanceof CsvFileError) return { ok: false, mode, rows: [], message: e.message };
    throw e;
  }
}

// 반영: 파일을 다시 검사하고, 미리보기 때와 계획이 완전히 같을 때만 한 번의 요청(전부 성공 또는 전부 실패)으로 저장
export async function applyProductCsv(formData: FormData): Promise<CsvApplyResult> {
  try {
    const { db, mode, plan } = await makePlan(formData);
    if (plan.summary.error) return { ok: false, message: "오류가 있는 행이 있어 반영하지 않았습니다." };
    if (plan.token !== formData.get("token")) return { ok: false, message: "미리보기 이후 파일 또는 상품 데이터가 바뀌었습니다. 다시 미리보기 하세요." };
    if (!plan.payloads.length) return { ok: true, message: "변경할 상품이 없습니다.", inserted: 0, updated: 0 };
    // 신규만 모드는 insert: 그사이 같은 코드가 생기면 덮어쓰지 않고 전체 실패
    const { error } = mode === "insert"
      ? await db.from("products").insert(plan.payloads)
      : await db.from("products").upsert(plan.payloads, { onConflict: "slug" });
    if (error) return { ok: false, message: (error.code === "23505" ? "그사이 같은 상품코드가 등록되었습니다. 다시 미리보기 하세요. " : "저장 실패: ") + error.message };
    // 휴지통 상품이 CSV 로 다시 공개되지 않도록 판매중지 유지 (공개 여부는 복구 시 적용). 휴지통 SQL 미적용이면 무시
    const trashed = await db.from("products").select("id,active").in("slug", plan.payloads.map(p => p.slug)).not("deleted_at", "is", null);
    for (const row of trashed.data || []) if (row.active) await db.from("products").update({ active: false, deleted_was_active: true }).eq("id", row.id);
    revalidatePath("/"); revalidatePath("/products"); revalidatePath("/products/[slug]", "page"); revalidatePath("/builder"); revalidatePath("/admin");
    return { ok: true, message: "상품 반영을 완료했습니다.", inserted: plan.summary.new, updated: plan.summary.update };
  } catch (e) {
    if (e instanceof CsvFileError) return { ok: false, message: e.message };
    throw e;
  }
}
