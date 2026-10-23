"use client";
import { useState } from "react";
import Link from "next/link";
import { applyProductCsv, previewProductCsv, type CsvApplyResult, type CsvPreview } from "@/app/admin/import-actions";
const statusLabel = { new: "신규", update: "수정", same: "변경 없음", error: "오류" } as const;
// 1) 파일 선택 → 2) 미리보기(DB 변경 없음) → 3) 확인 후 반영. 반영 시 같은 파일을 다시 보내 서버가 재검사
export default function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"insert" | "upsert">("insert");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<CsvApplyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const form = (extra: Record<string, string> = {}) => {
    const fd = new FormData(); if (file) fd.set("file", file); fd.set("mode", mode);
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    return fd;
  };
  const reset = () => { setPreview(null); setResult(null); };
  async function runPreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!file) return; setBusy(true); reset();
    try { setPreview(await previewProductCsv(form())); }
    catch { setPreview({ ok: false, mode, rows: [], message: "미리보기 중 서버 오류가 발생했습니다. 잠시 후 다시 시도하세요." }); }
    finally { setBusy(false); }
  }
  async function runApply() {
    if (!preview?.token || !preview.summary) return;
    if (!window.confirm(`신규 ${preview.summary.new}개 등록, 기존 ${preview.summary.update}개 수정합니다. 반영할까요?`)) return;
    setBusy(true);
    try {
      const r = await applyProductCsv(form({ token: preview.token })); setResult(r);
      if (r.ok) { setPreview(null); setFile(null); }
    } catch { setResult({ ok: false, message: "반영 중 서버 오류가 발생했습니다. 아무것도 저장되지 않았을 수 있으니 상품 목록을 확인하세요." }); }
    finally { setBusy(false); }
  }
  const s = preview?.summary, changes = s ? s.new + s.update : 0;
  const rows = (preview?.rows || []).filter(r => !onlyIssues || r.status === "error" || r.status === "update");
  return <div className="csv-import">
    <form className="admin-form" onSubmit={runPreview}>
      <label>CSV 파일 (UTF-8 또는 한국어 엑셀 CSV, 1MB·1,000개 이하)<input type="file" accept=".csv,text/csv" required key={file ? "f" : "empty"} onChange={e => { setFile(e.currentTarget.files?.[0] || null); reset(); }} /></label>
      <div className="form-inline">
        <label><input type="radio" name="mode" checked={mode === "insert"} onChange={() => { setMode("insert"); reset(); }} /> 신규 상품만 등록 (이미 있는 상품코드는 오류)</label>
        <label><input type="radio" name="mode" checked={mode === "upsert"} onChange={() => { setMode("upsert"); reset(); }} /> 신규 등록 + 기존 상품 수정</label>
      </div>
      <button className="btn primary" type="submit" disabled={!file || busy}>{busy && !preview ? "검사 중..." : "미리보기 (아직 저장 안 됨)"}</button>
    </form>
    {result && <p className={`compat ${result.ok ? "good" : "bad"}`} role="status">{result.message}{result.ok && result.inserted !== undefined && ` 신규 ${result.inserted}개, 수정 ${result.updated}개.`} {result.ok && <Link className="text-link" href="/admin">상품 목록 보기 →</Link>}</p>}
    {preview && <section className="csv-preview">
      {preview.message && <p className="compat bad" role="alert">{preview.message}</p>}
      {s && <><div className="stats csv-stats"><div><span>신규</span><strong>{s.new}개</strong></div><div><span>수정</span><strong>{s.update}개</strong></div><div><span>변경 없음</span><strong>{s.same}개</strong></div><div><span>오류</span><strong>{s.error}개</strong></div></div>
        <p className="small-muted">파일 인코딩: {preview.encoding} · 반영 방식: {preview.mode === "upsert" ? "신규 등록 + 기존 상품 수정" : "신규 상품만 등록"}. 빈 칸은 기존 값 유지(신규는 기본값), 새 상품의 판매공개 기본값은 비공개입니다.</p>
        <label className="check"><input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.currentTarget.checked)} /> 오류·수정 행만 보기</label>
        <div className="table-wrap"><table className="admin-table csv-table"><thead><tr><th>행</th><th>상태</th><th>상품코드</th><th>상품명</th><th>내용</th></tr></thead><tbody>
          {rows.map(r => <tr key={r.row} className={`csv-${r.status}`}><td>{r.row}</td><td><span className={`tiny-badge${r.status === "error" ? " alt" : ""}`}>{statusLabel[r.status]}</span></td><td>{r.slug}</td><td>{r.name}</td><td>
            {r.errors.length > 0 ? <ul>{r.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              : r.changes.length > 0 ? <ul>{r.changes.map((c, i) => <li key={i}><strong>{c.field}</strong> {r.status === "update" ? <>{c.before} → {c.after}</> : c.after}</li>)}</ul> : "기존 상품과 같음"}
          </td></tr>)}
        </tbody></table></div>
        <div className="admin-actions"><button className="btn primary" type="button" disabled={busy || !preview.ok || changes === 0} onClick={runApply}>{busy ? "반영 중..." : `${changes}개 상품 반영`}</button><button className="btn secondary" type="button" disabled={busy} onClick={reset}>취소</button></div>
        {!preview.ok && <p className="small-muted">오류가 하나라도 있으면 반영할 수 없습니다(일부만 저장되는 일 방지).</p>}
      </>}
    </section>}
  </div>;
}
