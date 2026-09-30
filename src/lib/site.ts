/*
 * 사이트 공통 정보 — 메타데이터·JSON-LD·개인정보처리방침·이용약관·푸터에 쓴다.
 * 운영 전에 NEXT_PUBLIC_SUPPORT_EMAIL을 실제 고객 문의 주소로 지정한다
 * (Stripe 계정 심사와 AdSense 승인에 연락처가 필요하다).
 */

export const SITE_NAME = "K-Name Studio";

/** 한 줄 소개 — 검색 결과 제목 뒤와 SNS 공유 카드 제목(og:title)에 쓴다 */
export const SITE_TAGLINE = "Discover Your Korean Name & Saju";

/** 검색 결과 설명 (160자 안팎) */
export const SITE_DESCRIPTION =
  "Get a meaningful Korean name crafted from your Saju (Four Pillars of Destiny), balanced with the five elements and written in Hanja — plus a Korean seal and name certificate.";

/**
 * SNS 공유 카드 설명 — 카카오톡·X·페이스북 미리보기에서 제목 아래 한두 줄.
 * 무료 개방 중이면 lib/seo/metadata.ts가 "Free, no sign-up."을 덧붙인다.
 */
export const SITE_SOCIAL_DESCRIPTION =
  "Your Korean name in Hangul & Hanja, read from your Saju birth chart — with your five elements, a Korean seal and a name card to share.";

export const SITE_KEYWORDS = [
  "Korean name",
  "Korean name generator",
  "my Korean name",
  "Saju",
  "Four Pillars of Destiny",
  "Hanja name",
  "Korean name meaning",
  "Korean seal",
  "dojang",
  "K-pop",
];

export const SITE_LOCALE = "en_US";

/** 사이트 테마 색 (한지) — 브라우저 UI·PWA 매니페스트 */
export const SITE_THEME_COLOR = "#f6f1e7";

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@example.com";

/** X(트위터) 계정 — "@kname_studio" 형식. 없으면 카드에 넣지 않는다 */
export const TWITTER_HANDLE = normalizeHandle(
  process.env.NEXT_PUBLIC_TWITTER_HANDLE,
);

/** 정책 문서를 마지막으로 고친 날 — 문서에 보이는 날짜와 sitemap의 lastmod (둘을 함께 고친다) */
export const POLICY_UPDATED_AT = "September 29, 2026";
export const POLICY_UPDATED_ISO = "2026-09-29";

function normalizeHandle(value: string | undefined): string | undefined {
  const handle = value?.trim().replace(/^@/, "");
  return handle && /^\w{1,15}$/.test(handle) ? `@${handle}` : undefined;
}
