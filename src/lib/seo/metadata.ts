import type { Metadata } from "next";

import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TAGLINE,
  TWITTER_HANDLE,
} from "@/lib/site";

export const DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** app/opengraph-image.tsx가 만드는 공유 이미지 주소 (metadataBase 기준) */
export const DEFAULT_SOCIAL_IMAGE = "/opengraph-image";

interface PageMetadataOptions {
  /** 페이지 제목 — 레이아웃의 "%s · K-Name Studio" 틀에 들어간다. 없으면 기본 제목 */
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
 */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  index = true,
}: PageMetadataOptions): Metadata {
  const socialTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
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
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [DEFAULT_SOCIAL_IMAGE],
      ...(TWITTER_HANDLE
        ? { site: TWITTER_HANDLE, creator: TWITTER_HANDLE }
        : {}),
    },
    ...(index ? {} : { robots: { index: false, follow: false } }),
  };
}
