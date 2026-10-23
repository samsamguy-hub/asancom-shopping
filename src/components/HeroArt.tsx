// 메인 배너 그림: 직접 그린 게이밍 PC 일러스트 (SVG). 외부 이미지 없음
// RGB 팬 회전·불빛 깜빡임은 CSS 애니메이션 (움직임 줄이기 설정 시 정지)
const Fan = ({ x, y, r = 26 }: { x: number; y: number; r?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r + 4} fill="#0a0f24" />
    <circle r={r} fill="none" stroke="url(#rgb)" strokeWidth="5" className="ha-glow" />
    <g className="ha-spin">
      {[0, 72, 144, 216, 288].map(a => (
        <path key={a} transform={`rotate(${a})`} d={`M0 0 C ${r * 0.25} ${-r * 0.35}, ${r * 0.75} ${-r * 0.45}, ${r * 0.8} ${-r * 0.1} C ${r * 0.5} ${-r * 0.05}, ${r * 0.2} 0, 0 0 Z`} fill="#9fd8ff" opacity="0.75" />
      ))}
    </g>
    <circle r={r * 0.22} fill="#1a2350" stroke="#7cd3ff" strokeWidth="1.5" />
  </g>
);

// 부품 배지: 위치(x,y)·폭(w)·배경색·글자색
const BADGES = [
  { text: "GPU", x: 0, y: 40, w: 64, bg: "#3dffb5", fg: "#053a28" },
  { text: "DDR5", x: 150, y: 26, w: 70, bg: "#ffffff", fg: "#1559c9" },
  { text: "SSD", x: 408, y: 2, w: 64, bg: "#ffd54a", fg: "#3a2a00" },
  { text: "CPU", x: 184, y: 250, w: 60, bg: "#ff8a3d", fg: "#ffffff" },
  { text: "M/B", x: 0, y: 238, w: 60, bg: "#a34dff", fg: "#ffffff" },
  { text: "POWER", x: 300, y: 342, w: 80, bg: "#ff4f6d", fg: "#ffffff" },
  { text: "CASE", x: 424, y: 150, w: 56, bg: "#3db4ff", fg: "#ffffff" },
];

export default function HeroArt() {
  return (
    <svg className="hero-svg" viewBox="0 0 480 380" role="img" aria-label="화려한 RGB 조명의 게이밍 PC와 모니터">
      <defs>
        <linearGradient id="rgb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff3d8b" /><stop offset=".25" stopColor="#ffb02e" /><stop offset=".5" stopColor="#3dffb5" />
          <stop offset=".75" stopColor="#3db4ff" /><stop offset="1" stopColor="#a34dff" />
        </linearGradient>
        <linearGradient id="rgbH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff3d8b" /><stop offset=".33" stopColor="#ffb02e" /><stop offset=".66" stopColor="#3dffb5" /><stop offset="1" stopColor="#3db4ff" />
        </linearGradient>
        <linearGradient id="case" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2b3566" /><stop offset="1" stopColor="#0b1030" /></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6f5bff" stopOpacity=".35" /><stop offset=".5" stopColor="#1b1f4f" stopOpacity=".55" /><stop offset="1" stopColor="#0f8fff" stopOpacity=".3" /></linearGradient>
        <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a0f5c" /><stop offset=".55" stopColor="#b6266e" /><stop offset="1" stopColor="#ff8a3d" /></linearGradient>
        <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe45c" /><stop offset="1" stopColor="#ff4f8a" /></linearGradient>
        <radialGradient id="halo"><stop offset="0" stopColor="#3da5ff" stopOpacity=".75" /><stop offset="1" stopColor="#3da5ff" stopOpacity="0" /></radialGradient>
        <radialGradient id="halo2"><stop offset="0" stopColor="#b14dff" stopOpacity=".6" /><stop offset="1" stopColor="#b14dff" stopOpacity="0" /></radialGradient>
        <clipPath id="screenClip"><rect x="34" y="96" width="196" height="122" rx="6" /></clipPath>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      {/* 뒤쪽 빛 번짐 */}
      <circle cx="320" cy="180" r="170" fill="url(#halo)" className="ha-pulse" />
      <circle cx="120" cy="160" r="130" fill="url(#halo2)" className="ha-pulse ha-delay" />

      {/* 모니터 */}
      <g>
        <rect x="26" y="88" width="212" height="138" rx="12" fill="#0b1030" stroke="#3b4a8f" strokeWidth="2" />
        <g clipPath="url(#screenClip)">
          <rect x="34" y="96" width="196" height="122" fill="url(#screen)" />
          <circle cx="132" cy="168" r="34" fill="url(#sun)" />
          {[150, 156, 162].map(y => <rect key={y} x="90" y={y} width="84" height="2.5" fill="#b6266e" />)}
          <path d="M34 186 L80 160 L110 176 L150 150 L190 172 L230 158 L230 218 L34 218 Z" fill="#1a0b3d" />
          {[0, 1, 2, 3, 4, 5, 6].map(i => <line key={i} x1={132} y1={186} x2={34 + i * 32.7} y2={218} stroke="#ff4fd8" strokeWidth="1" opacity=".7" />)}
          {[192, 200, 210].map(y => <line key={y} x1="34" y1={y} x2="230" y2={y} stroke="#ff4fd8" strokeWidth="1" opacity=".6" />)}
        </g>
        <rect x="118" y="226" width="28" height="30" fill="#232c5c" />
        <rect x="86" y="254" width="92" height="8" rx="4" fill="#2f3a73" />
      </g>

      {/* 본체 */}
      <g>
        <rect x="236" y="34" width="190" height="300" rx="18" fill="url(#case)" stroke="#5b6cc4" strokeWidth="2.5" />
        <rect x="250" y="50" width="122" height="268" rx="10" fill="url(#glass)" stroke="#8ea4ff" strokeOpacity=".5" />
        {/* 메인보드 */}
        <rect x="262" y="64" width="98" height="150" rx="6" fill="#141a3d" stroke="#2f3a7a" />
        {/* CPU 쿨러 */}
        <Fan x={300} y={110} r={22} />
        {/* 메모리 */}
        {[332, 342].map(x => <rect key={x} x={x} y="80" width="7" height="58" rx="2" fill="url(#rgb)" className="ha-glow" />)}
        {/* 그래픽카드 */}
        <rect x="258" y="176" width="108" height="30" rx="6" fill="#0d1230" stroke="#4d5cb0" />
        <rect x="262" y="200" width="100" height="4" rx="2" fill="url(#rgbH)" className="ha-glow" />
        <circle cx="286" cy="190" r="9" fill="none" stroke="#7cd3ff" strokeWidth="2" />
        <circle cx="336" cy="190" r="9" fill="none" stroke="#7cd3ff" strokeWidth="2" />
        {/* 파워 덮개 */}
        <rect x="258" y="270" width="108" height="40" rx="6" fill="#0d1230" />
        <text x="312" y="295" textAnchor="middle" fontSize="11" fontWeight="900" fill="#7cd3ff" letterSpacing="3">ASAN</text>
        {/* 앞면 팬 3개 */}
        <rect x="380" y="50" width="34" height="268" rx="8" fill="#0a0f24" />
        <Fan x={397} y={100} r={15} />
        <Fan x={397} y={184} r={15} />
        <Fan x={397} y={268} r={15} />
        {/* 바닥 불빛 */}
        <rect x="250" y="328" width="164" height="5" rx="2.5" fill="url(#rgbH)" filter="url(#blur)" className="ha-pulse" />
      </g>

      {/* 키보드 */}
      <g>
        <rect x="40" y="296" width="196" height="40" rx="9" fill="#151b44" stroke="#3b4a8f" strokeWidth="2" />
        {[0, 1, 2].map(row => Array.from({ length: 12 }, (_, i) => <rect key={`${row}-${i}`} x={50 + i * 15} y={304 + row * 9} width="12" height="6" rx="1.5" fill="url(#rgbH)" opacity=".85" />))}
      </g>

      {/* 떠 있는 부품 배지 (위아래로 둥실둥실, 배지마다 시차) */}
      {BADGES.map((b, i) => (
        <g key={b.text} className="ha-float" style={{ animationDelay: `${-i * 0.6}s`, animationDuration: `${3.4 + (i % 3) * 0.5}s` }}>
          <rect x={b.x} y={b.y} width={b.w} height="32" rx="10" fill={b.bg} stroke="#ffffff" strokeOpacity=".55" strokeWidth="1.5" />
          <text x={b.x + b.w / 2} y={b.y + 21} textAnchor="middle" fontSize="13" fontWeight="900" fill={b.fg}>{b.text}</text>
        </g>
      ))}

      {/* 반짝임 */}
      {[[230, 20], [455, 120], [20, 270], [460, 330]].map(([x, y], i) => (
        <path key={i} className={`ha-twinkle ha-t${i}`} transform={`translate(${x} ${y})`} d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z" fill="#fff" />
      ))}
    </svg>
  );
}
