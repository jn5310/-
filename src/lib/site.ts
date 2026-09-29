/*
 * 사이트 공통 정보 — 개인정보처리방침·이용약관·푸터에 쓴다.
 * 운영 전에 NEXT_PUBLIC_SUPPORT_EMAIL을 실제 고객 문의 주소로 지정한다
 * (Stripe 계정 심사와 AdSense 승인에 연락처가 필요하다).
 */

export const SITE_NAME = "K-Name Studio";

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@example.com";

/** 정책 문서를 마지막으로 고친 날 */
export const POLICY_UPDATED_AT = "September 29, 2026";
