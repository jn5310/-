import type { MetadataRoute } from "next";

import { getSiteUrl, isProductionSite } from "@/lib/site-url";

/**
 * /robots.txt
 * - 운영: 전체 허용, API만 제외. 개인 풀이는 막지 않고 noindex로 뺀다 — robots.txt로 막으면
 *   검색 엔진이 noindex를 읽지 못해 주소만 색인되는 일이 생긴다. AdSense 크롤러도 풀이 화면을 읽어야 한다.
 * - Vercel 미리보기·개발: 전체 차단 (중복 문서 방지)
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProductionSite()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const siteUrl = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: new URL("/sitemap.xml", siteUrl).href,
    host: siteUrl.origin,
  };
}
