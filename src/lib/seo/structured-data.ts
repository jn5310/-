import { PREMIUM_OFFER } from "@/lib/pricing";
import { SITE_DESCRIPTION, SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

/*
 * 검색 엔진용 구조화 데이터(JSON-LD, schema.org).
 * 조직(Organization) · 웹사이트(WebSite) · 웹 앱과 가격(WebApplication + Offer)을 하나의 @graph로 묶는다.
 * 평점(aggregateRating)처럼 실제로 없는 값은 넣지 않는다 — 꾸며 넣으면 Google 정책 위반으로 리치 결과가 막힌다.
 */

type JsonLdObject = Record<string, unknown>;

export function buildSiteStructuredData(siteUrl: URL): JsonLdObject {
  const home = new URL("/", siteUrl).href;
  const organizationId = `${home}#organization`;
  const hasRealSupportEmail = !SUPPORT_EMAIL.endsWith("@example.com");

  const organization: JsonLdObject = {
    "@type": "Organization",
    "@id": organizationId,
    name: SITE_NAME,
    url: home,
    logo: new URL("/icon.svg", siteUrl).href,
    ...(hasRealSupportEmail
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: SUPPORT_EMAIL,
            availableLanguage: ["English", "Korean"],
          },
        }
      : {}),
  };

  const website: JsonLdObject = {
    "@type": "WebSite",
    "@id": `${home}#website`,
    url: home,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": organizationId },
  };

  const application: JsonLdObject = {
    "@type": "WebApplication",
    "@id": `${home}#app`,
    name: SITE_NAME,
    url: home,
    description: SITE_DESCRIPTION,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    inLanguage: "en",
    isAccessibleForFree: true,
    image: new URL("/opengraph-image", siteUrl).href,
    publisher: { "@id": organizationId },
    offers: [
      {
        "@type": "Offer",
        name: "Free preview — one Korean name",
        price: "0",
        priceCurrency: PREMIUM_OFFER.currency.toUpperCase(),
        url: `${home}#studio`,
      },
      {
        "@type": "Offer",
        name: "Premium reading — three names, Saju & Hanja analysis, seal and certificate",
        price: (PREMIUM_OFFER.amount / 100).toFixed(2),
        priceCurrency: PREMIUM_OFFER.currency.toUpperCase(),
        availability: "https://schema.org/InStock",
        url: `${home}#studio`,
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website, application],
  };
}

/**
 * <script type="application/ld+json">에 넣을 문자열.
 * "<"를 이스케이프해 값 안의 "</script>"가 태그를 닫지 못하게 한다 (Next.js 권장 방식).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
