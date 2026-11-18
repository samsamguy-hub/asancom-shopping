"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";
import type { Recommended, RecommendSort } from "@/lib/products";
// 메인 추천상품: 정렬 버튼 + 한 페이지 8개(PC 4개×2줄, 태블릿 3열, 모바일 2열) 페이지 넘기기. 자동 넘김 없음
// 이동: 좌우 화살표 · 아래 페이지 번호(이전 | 1 | 2 | 3 | 다음) · 모바일 스와이프가 모두 같은 페이지 상태를 사용
// 순서는 서버가 판매 공개 상품 전체 기준으로 계산해서 내려줌 (getRecommendedProducts). 인기순 순서(orders.popular)는 서버에 남아 있지만 메인 버튼에서는 뺌
const SORTS: { key: RecommendSort; label: string }[] = [
  { key: "recommended", label: "추천순" },
  { key: "discount", label: "할인율순" },
  { key: "priceAsc", label: "낮은가격순" },
  { key: "priceDesc", label: "높은가격순" },
  { key: "latest", label: "등록순" },
];
const PAGE_SIZE = 8;
export default function RecommendedProducts({ products, orders, isDemo }: Recommended & { isDemo: boolean }) {
  const [sort, setSort] = useState<RecommendSort>("recommended");
  const [page, setPage] = useState(0);
  const track = useRef<HTMLDivElement>(null), section = useRef<HTMLDivElement>(null);
  const byId = new Map(products.map(p => [p.id, p]));
  const list = orders[sort].map(id => byId.get(id)).filter((p): p is Product => !!p);
  const pages: Product[][] = [];
  for (let i = 0; i < list.length; i += PAGE_SIZE) pages.push(list.slice(i, i + PAGE_SIZE));
  // 현재 페이지: 스크롤 위치에서 계산 (스와이프·화살표·번호 모두 반영)
  const update = useCallback(() => {
    const el = track.current; if (!el || !el.clientWidth) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);
  useEffect(() => { const onResize = () => update(); window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, [update]);
  // 정렬을 바꾸면 1페이지부터
  useEffect(() => { track.current?.scrollTo({ left: 0 }); setPage(0); }, [sort]);
  const go = (i: number) => {
    const el = track.current?.children[i] as HTMLElement | undefined; if (!el) return;
    setPage(i); el.parentElement?.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
    // 페이지 번호(목록 아래)를 눌러 목록 윗부분이 화면 밖이면 추천상품 위치로 이동
    const top = section.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) section.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const many = pages.length > 1, cur = Math.min(page, Math.max(0, pages.length - 1));
  // 사진은 보고 있는 페이지와 바로 옆 페이지만 그려서 필요한 사진만 받음 (나머지 페이지는 빈 칸)
  const near = (i: number) => Math.abs(i - cur) <= 1;
  const nums = pages.map((_, i) => i).filter(i => i === 0 || i === pages.length - 1 || Math.abs(i - cur) <= 2);
  return <div ref={section} className="rec-wrap">
    <div className="rec-sorts" role="group" aria-label="추천상품 정렬">{SORTS.map(s => <button key={s.key} type="button" className={`rec-sort${sort === s.key ? " active" : ""}`} aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</button>)}</div>
    <div className="rec-slider">
      {many && <button type="button" className="rec-arrow prev" aria-label="이전 페이지" disabled={cur <= 0} onClick={() => go(cur - 1)}>‹</button>}
      <div className="rec-track" ref={track} onScroll={update}>{pages.map((items, i) => <div className="rec-page" key={`${sort}-${i}`} aria-label={`${i + 1} / ${pages.length} 페이지`} aria-hidden={i !== cur}>{near(i) && items.map(p => <ProductCard key={p.id} p={p} isDemo={isDemo} />)}</div>)}</div>
      {many && <button type="button" className="rec-arrow next" aria-label="다음 페이지" disabled={cur >= pages.length - 1} onClick={() => go(cur + 1)}>›</button>}
    </div>
    {many && <div className="admin-pager rec-page-nav"><nav className="pager" aria-label="추천상품 페이지">
      <button type="button" className={cur <= 0 ? "disabled" : ""} disabled={cur <= 0} onClick={() => go(cur - 1)}>이전</button>
      {nums.map((n, k) => <span key={n} className="pager-item">{k > 0 && n - nums[k - 1] > 1 && <span className="gap">…</span>}<button type="button" className={n === cur ? "active" : ""} aria-current={n === cur ? "page" : undefined} onClick={() => go(n)}>{n + 1}</button></span>)}
      <button type="button" className={cur >= pages.length - 1 ? "disabled" : ""} disabled={cur >= pages.length - 1} onClick={() => go(cur + 1)}>다음</button>
    </nav></div>}
  </div>;
}
