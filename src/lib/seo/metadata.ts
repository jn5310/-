import type { Metadata } from "next";

import { isPaywallEnabled } from "@/lib/monetization";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_SOCIAL_DESCRIPTION,
  SITE_TAGLINE,
  TWITTER_HANDLE,
} from "@/lib/site";

/** 검색 결과 제목 (홈) — "K-Name Studio — Discover Your Korean Name & Saju" */
export const DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** SNS 공유 카드 제목 (홈) — 미리보기에서 가장 크게 보인다. 사이트 이름은 og:site_name으로 따로 나간다 */
export const SOCIAL_TITLE = SITE_TAGLINE;

export const OG_IMAGE_ALT = `Discover your Korean name & Saju — ${SITE_NAME}`;

/**
 * 공유 이미지 판 — app/opengraph-image.tsx의 디자인을 바꾸면 올린다.
 * 카카오톡·페이스북은 이미지를 주소별로 오래 캐시하므로 주소가 바뀌어야 새 이미지를 받아 간다.
 */
const OG_IMAGE_VERSION = "2";

/**
 * app/opengraph-image.tsx가 만드는 공유 이미지 (metadataBase 기준 주소).
 * Next.js는 페이지에 openGraph가 있으면 레이아웃의 openGraph를 통째로 바꾸고, 파일 규칙 이미지도
 * 그 폴더에서만 붙인다 — 그래서 모든 페이지의 openGraph에 이미지를 직접 넣는다.
 * twitter:image는 따로 적지 않는다 — twitter에 images가 없으면 Next.js가 openGraph 이미지를 그대로 쓴다.
 */
export const DEFAULT_SOCIAL_IMAGE = {
  url: `/opengraph-image?v=${OG_IMAGE_VERSION}`,
  width: 1200,
  height: 630,
  alt: OG_IMAGE_ALT,
  type: "image/png",
};

/** 공유 카드 설명 — 무료 개방 중이면 "무료"를 붙인다 */
export function socialDescription(): string {
  return isPaywallEnabled()
    ? SITE_SOCIAL_DESCRIPTION
    : `${SITE_SOCIAL_DESCRIPTION} Free, no sign-up.`;
}

interface PageMetadataOptions {
  /** 페이지 제목 — 레이아웃의 "%s · K-Name Studio" 틀에 들어간다. 없으면 기본 제목(홈) */
  title?: string;
  description?: string;
  /** canonical 경로 (예: "/privacy") */
  path: string;
  /** false면 검색 결과에서 뺀다 (개인 풀이 페이지 등) */
  index?: boolean;
}

/**
 * 페이지별 메타데이터.
 * Next.js는 레이아웃과 페이지의 openGraph·twitter를 깊게 합치지 않고 통째로 바꾸므로, 여기서 매번 전부 채운다.
 * canonical도 페이지마다 따로 둔다 — 레이아웃에 두면 모든 페이지가 홈을 canonical로 가리키게 된다.
 * 홈(title 없음)의 공유 카드는 "Discover Your Korean Name & Saju" + 공유용 설명을 쓴다.
 */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  index = true,
}: PageMetadataOptions): Metadata {
  const socialTitle = title ? `${title} · ${SITE_NAME}` : SOCIAL_TITLE;
  const cardDescription = title ? description : socialDescription();
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      url: path,
      title: socialTitle,
      description: cardDescription,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
    twitter: twitterCard(socialTitle, cardDescription),
    ...(index ? {} : { robots: { index: false, follow: false } }),
  };
}

/** X(트위터) 큰 이미지 카드 — 이미지는 openGraph에서 이어받는다 */
export function twitterCard(
  title: string,
  description: string,
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title,
    description,
    ...(TWITTER_HANDLE
      ? { site: TWITTER_HANDLE, creator: TWITTER_HANDLE }
      : {}),
  };
}
