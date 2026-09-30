import type { NextConfig } from "next";

/** 모든 응답에 붙이는 보안 헤더 (Vercel은 HTTPS·HSTS를 기본 제공하지만 명시해 둔다) */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // 다른 사이트로 나가는 요청에는 출처(도메인)만 보낸다 — 풀이 주소(접근 권한)가 광고·외부 서비스로 새지 않게
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
];

/**
 * 링크 미리보기 봇 — 이 봇에게는 메타 태그를 <head>에 넣은 채로 보낸다.
 * Next.js는 동적 페이지(/reading/…)의 메타데이터를 스트리밍으로 본문 뒤쪽에 보내는데, 미리보기 봇은 <head>만 읽는다.
 * 기본 목록(Next.js 16.3 html-bots.ts)에는 카카오톡 · 텔레그램 · 핀터레스트 · 다음이 없어 더한다
 * (htmlLimitedBots를 지정하면 기본 목록을 덮어쓰므로 기본 목록도 함께 적는다).
 */
const NEXT_DEFAULT_PREVIEW_BOTS = String.raw`[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight`;
const EXTRA_PREVIEW_BOTS = String.raw`kakaotalk-scrap|TelegramBot|Pinterestbot|Daumoa|Bluesky|Mastodon|Embedly|Iframely`;

const nextConfig: NextConfig = {
  poweredByHeader: false,

  htmlLimitedBots: new RegExp(
    `${NEXT_DEFAULT_PREVIEW_BOTS}|${EXTRA_PREVIEW_BOTS}`,
    "i",
  ),

  // 빌드할 때 코드에 박히는 값 — 비밀 값이 아니라 "켜져 있는지"만 브라우저에 알린다
  env: {
    // GA4 Measurement Protocol(서버)로 purchase를 보내면 브라우저는 purchase를 보내지 않는다 (중복 집계 방지)
    GA4_SERVER_PURCHASE:
      process.env.GA4_API_SECRET && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
        ? "1"
        : "0",
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // 개인 풀이·API는 검색 결과에 절대 올리지 않는다 (메타 태그와 이중으로)
      {
        source: "/reading/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
