import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import type { ReactNode } from "react";

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

export const metadata: Metadata = {
  title: {
    default: "K-Name Studio — Your Korean name, read from your Saju",
    template: "%s · K-Name Studio",
  },
  description:
    "Get a meaningful Korean name crafted from your Saju (Four Pillars of Destiny), balanced with the five elements and written in Hanja.",
  keywords: [
    "Korean name",
    "Korean name generator",
    "Saju",
    "Four Pillars of Destiny",
    "Hanja name",
    "K-pop",
  ],
  openGraph: {
    title: "K-Name Studio",
    description:
      "A Korean name crafted from your birth chart — meaning, balance and sound.",
    type: "website",
    siteName: "K-Name Studio",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
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
      </body>
    </html>
  );
}
