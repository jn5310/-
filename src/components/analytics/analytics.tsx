"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

import {
  CONSENT_REQUIRED_REGIONS,
  GA_MEASUREMENT_ID,
} from "@/lib/analytics/config";
import { redactUrl, safePageTitle } from "@/lib/analytics/redact";

/**
 * 방문 분석 — 두 갈래로 기록한다.
 * 1. Google Analytics 4 (NEXT_PUBLIC_GA_MEASUREMENT_ID가 있을 때): 동의 모드 v2 · 비식별화한 page_view
 * 2. 자체 지표(/api/metrics/collect): 쿠키 없는 익명 집계 — 광고 차단기와 무관해 매각 실사 때 GA 수치를 뒷받침한다
 *
 * GA의 '향상된 측정 › 브라우저 기록 이벤트 기반 페이지 변경'은 끈다 (docs/DEPLOYMENT.md) —
 * 여기서 비식별화한 page_view를 직접 보내기 때문이다. 켜 두면 풀이 주소가 그대로 GA에 쌓인다.
 */
export function Analytics() {
  const pathname = usePathname();
  const previousLocation = useRef<string | null>(null);
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    const href = window.location.href;
    // 개발 모드(StrictMode)의 이중 실행으로 같은 페이지를 두 번 세지 않는다
    if (lastTracked.current === href) return;
    lastTracked.current = href;

    const location = redactUrl(href);
    const firstView = previousLocation.current === null;
    const referrer = firstView
      ? redactUrl(document.referrer)
      : previousLocation.current;

    if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
      window.gtag("set", {
        page_location: location,
        page_referrer: referrer || undefined,
        page_title: safePageTitle(pathname, document.title),
      });
      window.gtag("event", "page_view");
    }

    sendMetricsBeacon({
      path: pathname,
      // 방문 수·유입 경로는 방문의 첫 페이지에서만 센다 (참조 주소는 도메인만 보낸다)
      ...(firstView
        ? {
            entry: true,
            referrer: originOf(document.referrer),
            utmSource:
              new URL(href).searchParams.get("utm_source") ?? undefined,
          }
        : {}),
    });

    previousLocation.current = location;
  }, [pathname]);

  if (!GA_MEASUREMENT_ID) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  );
}

/**
 * gtag 명령 대기열을 만들고 동의 모드 기본값 → config 순서로 넣는다.
 * gtag.js가 언제 로드되든 dataLayer 순서대로 처리되므로, 동의 기본값이 항상 먼저 적용된다.
 */
function initGoogleAnalytics() {
  if (!GA_MEASUREMENT_ID || window.__knsGaReady) return;
  window.__knsGaReady = true;

  window.dataLayer = window.dataLayer ?? [];
  // gtag.js는 arguments 객체 그대로를 기대한다 (배열로 바꾸면 명령을 인식하지 못한다)
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    region: CONSENT_REQUIRED_REGIONS,
    wait_for_update: 500,
  });
  window.gtag("consent", "default", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
  });
  window.gtag("set", "ads_data_redaction", true);
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    page_location: redactUrl(window.location.href),
  });
}

interface MetricsPayload {
  path: string;
  entry?: boolean;
  referrer?: string;
  utmSource?: string;
}

function originOf(href: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).origin;
  } catch {
    return undefined;
  }
}

/** 자체 방문 지표 — 페이지를 떠나도 전송되는 sendBeacon (text/plain이라 사전 요청이 없다) */
function sendMetricsBeacon(payload: MetricsPayload) {
  const body = JSON.stringify(payload);
  try {
    if (
      navigator.sendBeacon?.(
        "/api/metrics/collect",
        new Blob([body], { type: "text/plain;charset=UTF-8" }),
      )
    ) {
      return;
    }
  } catch {
    // 아래 fetch로 보낸다
  }
  void fetch("/api/metrics/collect", {
    method: "POST",
    body,
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    keepalive: true,
  }).catch(() => {});
}
