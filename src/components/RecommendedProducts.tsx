"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";
import type { Recommended, RecommendSort } from "@/lib/products";
// 메인 추천상품: 정렬 버튼 + 2줄 페이지 넘기기(PC 화살표, 모바일 스와이프). 자동 넘김 없음
// 순서는 서버가 판매 공개 상품 전체 기준으로 계산해서 내려줌 (getRecommendedProducts)
const SORTS: { key: RecommendSort; label: string }[] = [
  { key: "popular", label: "인기제품순" },
  { key: "discount", label: "할인율순" },
  { key: "priceAsc", label: "낮은가격순" },
  { key: "priceDesc", label: "높은가격순" },
  { key: "latest", label: "등록순" },
];
const ROWS = 2;
// 한 줄 상품 수: globals.css 의 .rec-page 열 수와 같은 기준 (PC 4, 태블릿 3, 모바일 2)
const colsFor = (w: number) => w <= 680 ? 2 : w <= 950 ? 3 : 4;
export default function RecommendedProducts({ products, orders, popularReady, isDemo }: Recommended & { isDemo: boolean }) {
  const [sort, setSort] = useState<RecommendSort>("latest");
  const [cols, setCols] = useState(4);
  const [page, setPage] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const byId = new Map(products.map(p => [p.id, p]));
  const list = orders[sort].map(id => byId.get(id)).filter((p): p is Product => !!p);
  const size = cols * ROWS, pages: Product[][] = [];
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size));
  // 현재 페이지: 스크롤 위치에서 계산 (화살표·스와이프 모두 반영)
  const update = useCallback(() => {
    const el = track.current; if (!el || !el.clientWidth) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);
  useEffect(() => {
    const onResize = () => { setCols(colsFor(window.innerWidth)); update(); };
    onResize(); window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize);
  }, [update]);
  // 정렬을 바꾸거나 한 줄 상품 수가 바뀌면 첫 페이지로
  useEffect(() => { track.current?.scrollTo({ left: 0 }); setPage(0); }, [sort, cols]);
  const go = (i: number) => { const el = track.current?.children[i] as HTMLElement | undefined; el?.parentElement?.scrollTo({ left: el.offsetLeft, behavior: "smooth" }); };
  const many = pages.length > 1;
  return <>
    <div className="rec-sorts" role="group" aria-label="추천상품 정렬">{SORTS.map(s => s.key === "popular" && !popularReady
      ? <button key={s.key} type="button" className="rec-sort" disabled title="조회수·판매량 집계 준비 중">{s.label}<small> (준비 중)</small></button>
      : <button key={s.key} type="button" className={`rec-sort${sort === s.key ? " active" : ""}`} aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</button>)}</div>
    <div className="rec-slider">
      {many && <button type="button" className="rec-arrow prev" aria-label="이전 상품" disabled={page <= 0} onClick={() => go(page - 1)}>‹</button>}
      <div className="rec-track" ref={track} onScroll={update}>{pages.map((items, i) => <div className="rec-page" key={i} aria-label={`${i + 1} / ${pages.length} 페이지`}>{items.map(p => <ProductCard key={p.id} p={p} isDemo={isDemo} />)}</div>)}</div>
      {many && <button type="button" className="rec-arrow next" aria-label="다음 상품" disabled={page >= pages.length - 1} onClick={() => go(page + 1)}>›</button>}
    </div>
    {many && <p className="rec-pager" aria-live="polite">{Math.min(page, pages.length - 1) + 1} / {pages.length}</p>}
  </>;
}
