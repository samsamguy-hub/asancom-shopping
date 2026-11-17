import Image from "next/image";
import MonitorSlides from "@/components/MonitorSlides";
import HeroRgbLayers from "@/components/HeroRgbLayers";
// 메인 배너 그림: 운영자가 제공한 완성 이미지(원본 public/asan-pc-showcase.png)를 같은 크기의 가벼운 WebP 사본(asan-pc-showcase.webp, 약 180KB)으로 표시
// 원본 1533×1026 비율 유지. 첫 화면에 바로 보이므로 미리 불러옴(priority). 팬 회전·RGB 조명 레이어와 모니터 풍경 슬라이드를 위에 겹침
export default function HeroArt() {
  return <div className="hero-stage">
    <Image className="hero-showcase" src="/asan-pc-showcase.webp" width={1533} height={1026} priority sizes="(max-width:680px) 100vw, 560px" alt="풍경 사진이 넘어가는 모니터와 RGB 키보드, 화려한 RGB 어항형 게이밍 PC 일러스트" />
    <HeroRgbLayers />
    <MonitorSlides />
  </div>;
}
