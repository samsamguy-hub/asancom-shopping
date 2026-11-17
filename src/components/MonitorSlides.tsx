"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
// 메인 배너 PNG의 모니터 화면 위에만 겹치는 풍경 슬라이드 (위치·크기는 globals.css .monitor-slides 퍼센트 좌표)
// 4초마다 0.6초 페이드 전환, 마우스를 올리면 일시정지, 화살표·점·스와이프로 직접 이동. 움직임 줄이기 설정 시 자동 전환 안 함
const SLIDES = [
  { src: "/hero-slides/1-neon-sunset.svg", alt: "보라색과 분홍색 네온 노을 풍경" },
  { src: "/hero-slides/2-palm-beach.svg", alt: "야자수가 있는 바다 풍경" },
  { src: "/hero-slides/3-snow-mountain.svg", alt: "눈 덮인 설산 풍경" },
  { src: "/hero-slides/4-blossom-lake.svg", alt: "분홍색 벚꽃과 호수 풍경" },
  { src: "/hero-slides/5-aurora-night.svg", alt: "오로라와 밤하늘 풍경" },
];
const INTERVAL = 4000;
export default function MonitorSlides() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);
  const go = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update(); mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // 장면이 바뀔 때마다 타이머를 새로 시작 → 직접 넘긴 뒤에도 4초 동안 머무름
  useEffect(() => {
    if (paused || reduced) return;
    const t = window.setTimeout(() => setIndex(i => (i + 1) % SLIDES.length), INTERVAL);
    return () => window.clearTimeout(t);
  }, [index, paused, reduced]);
  return <div className="monitor-slides" role="group" aria-roledescription="carousel" aria-label="모니터 풍경 슬라이드"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
    onTouchEnd={e => { const s = touchX.current; touchX.current = null; if (s === null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 30) go(index + (dx < 0 ? 1 : -1)); }}>
    {SLIDES.map((s, i) => <Image key={s.src} className={`monitor-slide${i === index ? " active" : ""}`} src={s.src} alt={i === index ? s.alt : ""} aria-hidden={i !== index} fill unoptimized sizes="200px" priority={i === 0} draggable={false} />)}
    <button type="button" className="monitor-arrow prev" aria-label="이전 풍경" onClick={() => go(index - 1)}>‹</button>
    <button type="button" className="monitor-arrow next" aria-label="다음 풍경" onClick={() => go(index + 1)}>›</button>
    <div className="monitor-dots">{SLIDES.map((s, i) => <button key={s.src} type="button" className={i === index ? "active" : ""} aria-label={`${i + 1}번 풍경`} aria-current={i === index} onClick={() => go(i)} />)}</div>
  </div>;
}
