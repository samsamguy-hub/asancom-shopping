"use client";
import { useEffect, useState } from "react";
// 관리자 상품목록·휴지통의 선택 처리 막대. 각 행의 체크박스는 form="bulk-delete" 로 이 폼에 연결 (행 안의 다른 폼과 겹치지 않게)
export const BULK_FORM_ID = "bulk-delete";
const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"][name="ids"]`));
function useSelectedCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(boxes().filter(b => b.checked).length);
    update(); document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, []);
  return count;
}
const setAll = (checked: boolean) => { boxes().forEach(b => { b.checked = checked; }); document.dispatchEvent(new Event("change")); };
export function SelectAllCheckbox() {
  const count = useSelectedCount(), total = typeof document === "undefined" ? 0 : boxes().length;
  return <input type="checkbox" aria-label="전체 선택" checked={total > 0 && count === total} onChange={e => setAll(e.target.checked)} />;
}
// confirm 문구의 {count} 는 선택한 개수로 바뀜
export type BulkAction = { action: (formData: FormData) => Promise<void>; label: string; confirm: string; danger?: boolean };
export function BulkDeleteBar({ actions }: { actions: BulkAction[] }) {
  const count = useSelectedCount();
  return <form id={BULK_FORM_ID} className="bulk-bar" onSubmit={e => {
    const label = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("data-label");
    const picked = actions.find(a => a.label === label);
    if (!count || !picked || !window.confirm(picked.confirm.replace("{count}", String(count)))) e.preventDefault();
  }}>
    <span>{count ? `${count}개 선택됨` : "상품을 체크하세요"}</span>
    {count > 0 && <button type="button" className="link-button" onClick={() => setAll(false)}>선택 해제</button>}
    <span className="bulk-buttons">{actions.map(a => <button key={a.label} type="submit" formAction={a.action} data-label={a.label} className={`btn small ${a.danger ? "danger" : "secondary"}`} disabled={!count}>{a.label}</button>)}</span>
  </form>;
}
