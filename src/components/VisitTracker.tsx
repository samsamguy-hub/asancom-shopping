"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isTrackedHost, normalizeVisitPath } from "@/lib/visit-rules";
// 방문자 통계: 운영 주소에서 페이지를 볼 때 경로만 서버에 알림 (쿼리·검색어·개인정보는 보내지 않음)
// 화면에는 아무것도 그리지 않음. 집계 제외 여부는 서버와 DB가 다시 확인
export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const path = normalizeVisitPath(pathname);
    if (!path || !isTrackedHost(location.hostname) || navigator.webdriver) return;
    // 새로고침 연타·중복 실행은 같은 페이지 10초에 1번만
    try {
      const last = JSON.parse(sessionStorage.getItem("ac_visit_last") || "null");
      if (last?.p === path && Date.now() - last.t < 10_000) return;
      sessionStorage.setItem("ac_visit_last", JSON.stringify({ p: path, t: Date.now() }));
    } catch { /* 저장소를 쓸 수 없으면 서버 중복 제한만 사용 */ }
    fetch("/api/visit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }), keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}
