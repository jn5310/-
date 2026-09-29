import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import type { ReactNode } from "react";

import { Analytics } from "@/components/analytics/analytics";
import { DEFAULT_SOCIAL_IMAGE, DEFAULT_TITLE } from "@/lib/seo/metadata";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
  TWITTER_HANDLE,
} from "@/lib/site";
import { getSiteUrl, isProductionSite } from "@/lib/site-url";

import "./globals.css";

// 가변 폰트라 weight를 생략한다. 한글·한자 글리프는 unicode-range 조각으로 필요할 때만 내려받는다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = getSiteUrl();
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.BING_SITE_VERIFICATION?.trim();

/**
 * 사이트 전체 기본 메타데이터. 페이지는 lib/seo/metadata.ts의 pageMetadata()로 제목·canonical·공유 카드를 채운다.
 * 공유 이미지는 app/opengraph-image.tsx가 만든다 (파일 규칙이라 openGraph.images보다 우선한다).
 */
export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: DEFAULT_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: siteUrl.href }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "lifestyle",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE],
    ...(TWITTER_HANDLE
      ? { site: TWITTER_HANDLE, creator: TWITTER_HANDLE }
      : {}),
  },
  // Vercel 미리보기·개발 서버는 색인하지 않는다
  robots: isProductionSite()
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      }
    : { index: false, follow: false },
  // Google Search Console · Bing Webmaster Tools 소유권 확인 (HTML 태그 방식의 content 값)
  ...(googleVerification || bingVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(bingVerification
            ? { other: { "msvalidate.01": bingVerification } }
            : {}),
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: SITE_THEME_COLOR,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}
    >
      <body className="hanji-texture flex min-h-full flex-col font-sans text-ink">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
