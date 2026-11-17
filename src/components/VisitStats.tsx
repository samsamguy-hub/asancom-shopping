import Link from "next/link";
import type { createClient } from "@/lib/supabase/server";
type Db = Awaited<ReturnType<typeof createClient>>;
type Stats = { today: number; yesterday: number; unique7: number; unique30: number; period_views: number; total_views: number; daily: { day: string; visitors: number; views: number }[]; top_pages: { path: string; views: number }[] };
// 관리자 대시보드 방문자 통계 (supabase/visitor_stats.sql 의 site_visit_stats 함수, 관리자만 조회 가능)
const PERIODS = [{ days: 1, label: "오늘" }, { days: 7, label: "7일" }, { days: 30, label: "30일" }];
const PAGE_NAMES: Record<string, string> = { "/": "홈", "/products": "상품 목록", "/builder": "조립PC 견적", "/estimate": "견적 상담", "/estimate/board": "견적 게시판", "/as": "A/S 신청", "/cart": "장바구니", "/checkout": "주문하기", "/about": "회사소개", "/login": "로그인", "/signup": "회원가입", "/mypage": "마이페이지", "/order/lookup": "비회원 주문조회" };
const decode = (p: string) => { try { return decodeURIComponent(p); } catch { return p; } };
const num = (n: number) => n.toLocaleString("ko-KR");
const md = (day: string) => { const [, m, d] = day.split("-"); return `${Number(m)}/${Number(d)}`; };

export default async function VisitStats({ db, period }: { db: Db; period?: string }) {
  const days = PERIODS.find(p => String(p.days) === period)?.days ?? 7;
  const label = PERIODS.find(p => p.days === days)!.label;
  const { data, error } = await db.rpc("site_visit_stats", { p_days: days });
  if (error || !data) return <section className="visit-stats"><div className="visit-head"><h2>방문자 통계</h2></div>
    <p className="compat bad" role="status">{error?.code === "PGRST202" ? "방문자 통계를 쓰려면 Supabase SQL Editor에서 supabase/visitor_stats.sql을 먼저 실행하세요." : "방문자 통계를 불러오지 못했습니다. 잠시 후 다시 시도하세요."}</p></section>;
  const s = data as Stats;
  const max = Math.max(1, ...s.daily.map(d => d.visitors));
  const topMax = Math.max(1, ...s.top_pages.map(p => p.views));
  const every = s.daily.length > 10 ? 5 : 1;
  return <section className="visit-stats" aria-labelledby="visit-title">
    <div className="visit-head"><div><h2 id="visit-title">방문자 통계</h2><p>한국시간 기준 · 관리자·봇 제외 · 운영 주소(asancom.com) 접속만 집계</p></div>
      <nav className="visit-periods" aria-label="통계 기간">{PERIODS.map(p => <Link key={p.days} href={`/admin?visits=${p.days}`} scroll={false} aria-current={p.days === days ? "page" : undefined}>{p.label}</Link>)}</nav></div>
    <div className="visit-cards">
      <div><span>오늘 방문자</span><strong>{num(s.today)}명</strong></div>
      <div><span>어제 방문자</span><strong>{num(s.yesterday)}명</strong></div>
      <div><span>최근 7일 순 방문자</span><strong>{num(s.unique7)}명</strong></div>
      <div><span>최근 30일 순 방문자</span><strong>{num(s.unique30)}명</strong></div>
      <div><span>페이지 조회수 ({label})</span><strong>{num(s.period_views)}회</strong></div>
      <div><span>전체 페이지 조회수</span><strong>{num(s.total_views)}회</strong><small>집계 시작 후 누적</small></div>
    </div>
    <div className="visit-body">
      <div><h3>날짜별 방문자 (최근 {s.daily.length}일)</h3>
        <div className="visit-chart" role="img" aria-label={s.daily.map(d => `${md(d.day)} ${d.visitors}명`).join(", ")}>
          {s.daily.map((d, i) => <div key={d.day} className={`visit-col${i === s.daily.length - 1 ? " today" : ""}`} title={`${md(d.day)} 방문자 ${num(d.visitors)}명 · 조회 ${num(d.views)}회`}>
            {s.daily.length <= 10 && <b>{d.visitors}</b>}<div className="visit-bar" style={{ height: `${Math.max(1, (d.visitors / max) * 85)}%` }} /></div>)}
        </div>
        <div className="visit-labels" aria-hidden="true">{s.daily.map((d, i) => <span key={d.day}>{(s.daily.length - 1 - i) % every === 0 ? md(d.day) : ""}</span>)}</div>
      </div>
      <div><h3>인기 방문 페이지 TOP 10 ({label})</h3>
        {s.top_pages.length ? <ol className="visit-top">{s.top_pages.map((p, i) => <li key={p.path}><i style={{ width: `${(p.views / topMax) * 100}%` }} /><em>{i + 1}</em><span title={decode(p.path)}>{PAGE_NAMES[p.path] ? <>{PAGE_NAMES[p.path]}<small>{p.path}</small></> : decode(p.path)}</span><strong>{num(p.views)}</strong></li>)}</ol>
          : <p className="small-muted">아직 기록된 방문이 없습니다.</p>}
      </div>
    </div>
  </section>;
}
