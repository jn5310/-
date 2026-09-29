import { PREMIUM_OFFER } from "@/lib/pricing";

import { GA_MEASUREMENT_ID } from "./config";

/*
 * GA4 이벤트 — 전환 퍼널:
 *   name_form_start → name_form_submit → generate_lead(풀이 생성)
 *   → view_item(무료 결과 + 결제 제안) → begin_checkout(결제 버튼) → purchase(결제 완료)
 *
 * GA가 꺼져 있거나 광고 차단기에 막혀도 아무 일도 일어나지 않는다 (앱 동작에 영향 없음).
 * 이름·생년월일 같은 개인 정보는 이벤트에 넣지 않는다 (GA 약관 위반).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    /** GA 초기화를 한 번만 하도록 표시 */
    __knsGaReady?: boolean;
  }
}

export const ANALYTICS_EVENTS = {
  formStart: "name_form_start",
  formSubmit: "name_form_submit",
  /** 풀이가 만들어졌다 — GA4 권장 이벤트 generate_lead (키 이벤트로 표시) */
  lead: "generate_lead",
  generationError: "name_generation_error",
  /** 무료 결과 화면에서 프리미엄 제안을 봤다 */
  viewOffer: "view_item",
  /** 결제 버튼 클릭 — 키 이벤트 */
  beginCheckout: "begin_checkout",
  checkoutCancel: "checkout_cancel",
  /** 결제 완료 — 키 이벤트 (서버 측 전송이 켜져 있으면 서버가 보낸다) */
  purchase: "purchase",
  sealDownload: "seal_download",
  certificateDownload: "certificate_download",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type ParamValue =
  string | number | boolean | undefined | Record<string, unknown>[];
export type EventParams = Record<string, ParamValue>;

export function isAnalyticsEnabled(): boolean {
  return (
    Boolean(GA_MEASUREMENT_ID) &&
    typeof window !== "undefined" &&
    typeof window.gtag === "function"
  );
}

export function trackEvent(
  name: AnalyticsEventName,
  params: EventParams = {},
): void {
  if (!isAnalyticsEnabled()) return;
  window.gtag!("event", name, params);
}

/** 같은 탭 세션에서 한 번만 보낸다 (새로고침·다시 그리기로 중복 집계되지 않게) */
export function trackOnce(
  key: string,
  name: AnalyticsEventName,
  params: EventParams = {},
): void {
  if (!isAnalyticsEnabled()) return;
  try {
    const storageKey = `kns:ga:${key}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // 저장소를 쓸 수 없으면(사파리 사생활 보호 모드 등) 그냥 보낸다
  }
  trackEvent(name, params);
}

/** 전자상거래 이벤트 공통 값 — 프리미엄 풀이 1개 */
export function premiumEcommerce(): EventParams {
  const value = PREMIUM_OFFER.amount / 100;
  return {
    currency: PREMIUM_OFFER.currency.toUpperCase(),
    value,
    items: [
      {
        item_id: "premium_reading",
        item_name: "Premium name reading",
        price: value,
        quantity: 1,
      },
    ],
  };
}

export interface GaIdentifiers {
  clientId?: string;
  sessionId?: string;
}

/**
 * GA client_id·session_id — 결제 요청에 실어 보내면, 서버가 보내는 purchase가 같은 사용자·세션으로 묶인다.
 * gtag.js가 막혀 있으면 콜백이 오지 않으므로 짧게 기다리고 포기한다.
 */
export function getGaIdentifiers(timeoutMs = 500): Promise<GaIdentifiers> {
  if (!isAnalyticsEnabled() || !GA_MEASUREMENT_ID) return Promise.resolve({});
  const measurementId = GA_MEASUREMENT_ID;
  const read = (field: "client_id" | "session_id") =>
    new Promise<string | undefined>((resolve) => {
      const timer = window.setTimeout(() => resolve(undefined), timeoutMs);
      window.gtag!("get", measurementId, field, (value: unknown) => {
        window.clearTimeout(timer);
        resolve(
          value === undefined || value === null ? undefined : String(value),
        );
      });
    });
  return Promise.all([read("client_id"), read("session_id")]).then(
    ([clientId, sessionId]) => ({ clientId, sessionId }),
  );
}
