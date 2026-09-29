/*
 * Google Analytics 4 설정 — NEXT_PUBLIC_GA_MEASUREMENT_ID(G-XXXXXXX)가 없으면 GA 코드를 아예 싣지 않는다.
 * NEXT_PUBLIC_ 값은 빌드할 때 코드에 박히므로, 바꾸면 dev 서버를 다시 켜거나 다시 배포한다.
 */

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,16}$/;

function readMeasurementId(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toUpperCase();
  return trimmed && MEASUREMENT_ID_PATTERN.test(trimmed) ? trimmed : undefined;
}

export const GA_MEASUREMENT_ID = readMeasurementId(
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
);

/**
 * GA4_API_SECRET이 설정돼 있으면(next.config.ts가 빌드 때 "1"로 박는다) 결제 완료(purchase)는
 * 서버가 Measurement Protocol로 보낸다 — 광고 차단기나 결제 후 탭을 닫아도 빠지지 않는다.
 * 이때 브라우저는 purchase를 보내지 않아 두 번 집계되지 않는다.
 */
export const SERVER_SIDE_PURCHASE = process.env.GA4_SERVER_PURCHASE === "1";

/**
 * 광고·분석 쿠키에 사전 동의가 필요한 지역 (EEA · 영국 · 스위스) — 동의 모드 v2 기본값을 '거부'로 둔다.
 * AdSense의 Google 인증 동의 메시지(CMP)를 켜면 사용자가 고른 대로 갱신된다.
 */
// prettier-ignore
export const CONSENT_REQUIRED_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "GB", "CH",
];
