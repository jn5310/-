import type { MetadataRoute } from "next";

import { POLICY_UPDATED_ISO } from "@/lib/site";
import { getSiteUrl } from "@/lib/site-url";

/**
 * /sitemap.xml — 검색 엔진에 알릴 공개 페이지.
 * 개인 풀이(/reading/…)는 넣지 않는다 (noindex).
 * lastmod: 홈은 배포(빌드) 시각, 정책 문서는 실제로 고친 날 — 매번 바뀌는 값은 검색 엔진이 무시한다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const policyUpdated = new Date(`${POLICY_UPDATED_ISO}T00:00:00Z`);
  return [
    {
      url: new URL("/", siteUrl).href,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/privacy", siteUrl).href,
      lastModified: policyUpdated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: new URL("/terms", siteUrl).href,
      lastModified: policyUpdated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
