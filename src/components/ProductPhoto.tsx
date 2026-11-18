"use client";
import { useState, type ComponentProps } from "react";
import Image from "next/image";
// 상품사진: 축소본(src)을 먼저 보여주고, 불러오기에 실패하면 원본(fallback)으로 한 번 다시 시도
export default function ProductPhoto({ src, fallback, ...props }: ComponentProps<typeof Image> & { src: string; fallback?: string }) {
  const [failed, setFailed] = useState(false);
  const useFallback = failed && !!fallback && fallback !== src;
  return <Image {...props} src={useFallback ? fallback : src} onError={() => setFailed(true)} />;
}
