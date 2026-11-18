import { redirect } from "next/navigation";
// 관리자 목록 페이지 넘김 (10개씩). DB에서 해당 페이지 범위만 조회(range)하고 전체 개수(count)를 함께 받음
export const ADMIN_PAGE_SIZE = 10;
// ?page= 값 정리: 숫자 아님·1 미만 → 1
export const parsePage = (v: unknown) => { const n = Math.floor(Number(typeof v === "string" ? v : "")); return Number.isSafeInteger(n) && n >= 1 ? n : 1; };
export const pageRange = (page: number) => ({ from: (page - 1) * ADMIN_PAGE_SIZE, to: page * ADMIN_PAGE_SIZE - 1 });
export const lastPage = (total: number, size = ADMIN_PAGE_SIZE) => Math.max(1, Math.ceil(total / size));
// 삭제·복구 등으로 개수가 줄거나 주소에 큰 페이지를 넣어 범위를 벗어나면 마지막 페이지로 한 번에 이동
// (범위 밖 range 조회는 PostgREST 가 개수 없이 PGRST103 오류를 돌려줌 → recount: 같은 조건의 개수만 다시 조회)
export async function keepPageInRange(page: number, total: number | null, errorCode: string | undefined, href: (page: number) => string, recount: () => PromiseLike<{ count: number | null }>) {
  if (page <= 1) return;
  const n = errorCode === "PGRST103" ? (await recount()).count : total;
  if (n !== null && page > lastPage(n)) redirect(href(lastPage(n)));
}
// 처리 후 같은 페이지로 돌아가기 위한 주소 조각 (폼의 hidden page 값). 1페이지면 생략
export const pageQuery = (formData: FormData) => { const p = parsePage(formData.get("page")); return p > 1 ? `&page=${p}` : ""; };
