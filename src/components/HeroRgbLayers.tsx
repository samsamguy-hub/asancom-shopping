"use client";
import { useEffect, useRef, useState } from "react";
// 메인 배너 PNG(public/asan-pc-showcase.png, 1533×1026) 위에 겹치는 애니메이션 레이어. 원본 PNG는 수정하지 않음
// 1) 팬 회전: 원본에서 팬 타원 영역만 잘라 회전. 비스듬한 타원은 원으로 펼쳐 돌린 뒤 다시 눌러서 원래 팬과 정확히 겹침
//    허브(중심)·3번 상단 팬 앞 유리 빛줄기와 튜브는 원본 그대로 위에 다시 얹어 고정
// 2) RGB 조명: public/hero-anim/rgb-mask.webp(LED 픽셀만 고른 마스크) 영역에 흐르는 색을 '색조' 혼합 (globals.css .rgb-*)
// 좌표는 원본 픽셀 기준(측정값). 화면 밖이거나 움직임 줄이기 설정이면 정지
// cx,cy: 회전 중심 = 허브(가운데 구멍) 중심. 원본 그림은 허브가 바깥 테두리 중심에서 몇 px 벗어나 있어
// 테두리 중심으로 돌리면 허브가 흔들림 → 허브 중심으로 돌리고, 회전 영역(rx,ry)은 그만큼 줄여 바깥 테두리는 고정
type Fan = { cx: number; cy: number; rx: number; ry: number; deg: number; hrx: number; hry: number; dur: number; soft?: boolean };
const FANS: Fan[] = [
  // 상단 수냉 라디에이터 팬 (날개 없이 빛나는 링 → 링 색이 돌아감)
  { cx: 844, cy: 279, rx: 56.7, ry: 19, deg: 0.7, hrx: 20, hry: 10, dur: 3.4 },
  { cx: 960, cy: 260, rx: 61.4, ry: 21, deg: -0.1, hrx: 24, hry: 10, dur: 3.8 },
  { cx: 1084, cy: 241, rx: 60.8, ry: 22.8, deg: -0.2, hrx: 26, hry: 11, dur: 3.6 },
  // 정면 RGB 팬
  { cx: 1219, cy: 341, rx: 49, ry: 62.9, deg: 5.8, hrx: 18, hry: 21, dur: 2.6 },
  { cx: 1219, cy: 496, rx: 49, ry: 64.8, deg: 9, hrx: 18, hry: 21, dur: 2.9 },
  { cx: 1219, cy: 647, rx: 50.2, ry: 67, deg: 5.3, hrx: 18, hry: 21, dur: 2.75 },
  // 그래픽카드 팬: 덮개 장식이 팬 가장자리를 가려 안쪽만 회전, 바깥은 부드럽게 원본과 섞음
  { cx: 807, cy: 581, rx: 41, ry: 43, deg: 0, hrx: 20, hry: 21, dur: 2.2, soft: true },
  { cx: 905, cy: 579, rx: 45, ry: 45, deg: 0, hrx: 20, hry: 21, dur: 2.45, soft: true },
  { cx: 1011, cy: 576, rx: 44, ry: 46, deg: 0, hrx: 20, hry: 21, dur: 2.3, soft: true },
];
// 그래픽카드 팬 중심 로고를 덮는 허브 덮개 [중심 x, 중심 y, 반지름] (원본 픽셀 측정값)
const GPU_CAPS: [number, number, number][] = [[808, 584, 15], [905.5, 580, 15.5], [1012, 576.5, 16]];
const SRC = "/asan-pc-showcase.webp";
export default function HeroRgbLayers() {
  const root = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(true), [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches); onMq(); mq.addEventListener("change", onMq);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (root.current) io.observe(root.current);
    return () => { mq.removeEventListener("change", onMq); io.disconnect(); };
  }, []);
  // 팬 회전(SVG 애니메이션)은 화면 밖이거나 움직임 줄이기면 멈춤. 조명은 CSS(data-paused, 미디어쿼리)로 멈춤
  useEffect(() => { const s = svg.current; if (!s) return; if (visible && !reduced) s.unpauseAnimations(); else s.pauseAnimations(); }, [visible, reduced]);
  return <div ref={root} className="hero-rgb" data-paused={!visible || reduced || undefined} aria-hidden="true">
    <svg ref={svg} className="rgb-fans" viewBox="0 0 1533 1026" preserveAspectRatio="none">
      <defs>
        <image id="pc-src" href={SRC} width="1533" height="1026" />
        <radialGradient id="fan-edge"><stop offset=".86" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
        <radialGradient id="fan-edge-soft"><stop offset=".7" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
        <radialGradient id="hub-edge"><stop offset=".8" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
        {FANS.map((f, i) => <mask key={i} id={`fan-m${i}`} maskUnits="userSpaceOnUse"><ellipse transform={`rotate(${f.deg} ${f.cx} ${f.cy})`} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill={`url(#${f.soft ? "fan-edge-soft" : "fan-edge"})`} /></mask>)}
        {FANS.map((f, i) => <mask key={i} id={`hub-m${i}`} maskUnits="userSpaceOnUse"><ellipse cx={f.cx} cy={f.cy} rx={f.hrx} ry={f.hry} fill="url(#hub-edge)" /></mask>)}
        <clipPath id="glass-strip"><rect x="1108" y="205" width="42" height="70" /></clipPath>
        <linearGradient id="pump-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6a24a0" /><stop offset=".55" stopColor="#3f1a78" /><stop offset="1" stopColor="#170760" /></linearGradient>
        <linearGradient id="rgb-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff4fb0" /><stop offset=".5" stopColor="#9b4dff" /><stop offset="1" stopColor="#3dd6ff" /></linearGradient>
        <radialGradient id="hub-cap" cx=".4" cy=".35"><stop offset="0" stopColor="#4d3f6a" /><stop offset="1" stopColor="#1f1b3b" /></radialGradient>
      </defs>
      {FANS.map((f, i) => { const k = f.ry / f.rx; return <g key={i} mask={`url(#fan-m${i})`}>
        <g transform={`translate(${f.cx} ${f.cy}) rotate(${f.deg}) scale(1 ${k})`}>
          <g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur={`${f.dur}s`} repeatCount="indefinite" />
            <g transform={`scale(1 ${1 / k}) rotate(${-f.deg}) translate(${-f.cx} ${-f.cy})`}><use href="#pc-src" /></g>
          </g>
        </g>
      </g>; })}
      {FANS.map((f, i) => <use key={i} href="#pc-src" mask={`url(#hub-m${i})`} />)}
      <use href="#pc-src" clipPath="url(#glass-strip)" />
      {/* 상표 로고 가림: 원본 PNG의 CPU 수냉 블록·그래픽카드 팬 중심 로고 위에 무늬 없는 덮개와 ASAN 문양을 얹음 (원본 파일은 그대로) */}
      <g className="brand-cover">
        <polygon points="895,382 947,382 957,392 957,448 947,457 895,457 885,448 885,392" fill="url(#pump-panel)" />
        <circle cx="921" cy="419.5" r="19" fill="none" stroke="url(#rgb-ring)" strokeWidth="3" opacity=".9" />
        <text x="921" y="427" textAnchor="middle" fontSize="22" fontWeight="900" fill="#f4ecff" fontFamily="Arial, sans-serif">A</text>
        {GPU_CAPS.map(([cx, cy, r]) => <g key={cx}>
          <circle cx={cx} cy={cy} r={r} fill="url(#hub-cap)" stroke="#a99be0" strokeOpacity=".55" strokeWidth="1.2" />
          <circle cx={cx} cy={cy} r={r * 0.35} fill="#2a2452" stroke="#c9bdf5" strokeOpacity=".5" strokeWidth="1" />
        </g>)}
      </g>
    </svg>
    <div className="rgb-light rgb-case"><div className="rgb-flow" /></div>
    <div className="rgb-light rgb-ram"><div className="rgb-flow" /></div>
    <div className="rgb-light rgb-keys"><div className="rgb-flow" /></div>
  </div>;
}
