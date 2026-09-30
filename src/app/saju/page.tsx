import type { Metadata } from "next";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { SajuStudio } from "@/components/saju/saju-studio";
import { Eyebrow } from "@/components/ui/eyebrow";
import { pageMetadata } from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/site-url";

/*
 * /saju — 사주 분석 (사주 전용 메뉴).
 * 이름 추천 없이 생년월일시만으로 사주 원국 · 오행(목·화·토·금·수) 분포 · 일간 성향 · 총평을 보여 준다.
 */

export const metadata: Metadata = pageMetadata({
  title: "Free Saju Reading — Your Four Pillars & Five Elements",
  description:
    "Enter your birth date and time to see your Saju (Four Pillars of Destiny) chart, your balance of Wood, Fire, Earth, Metal and Water, and what your day master says about you — free and instant.",
  path: "/saju",
});

export default function SajuPage() {
  return (
    <>
      <SiteHeader current="saju" />
      <main id="main" className="flex-1">
        <section
          aria-labelledby="saju-title"
          className="relative isolate overflow-hidden px-5 pt-14 pb-20 sm:px-8 lg:pt-20 lg:pb-28"
        >
          <div
            aria-hidden="true"
            className="lattice absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          />
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <Eyebrow hangul="사주 분석">Saju reading</Eyebrow>
              <h1
                id="saju-title"
                className="mt-5 font-serif text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl"
              >
                Read your Four Pillars
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                Just your birth date and time. See your Saju (
                <span lang="ko">사주</span>) chart, how the five elements — Wood{" "}
                <span lang="ko">木</span>, Fire <span lang="ko">火</span>, Earth{" "}
                <span lang="ko">土</span>, Metal <span lang="ko">金</span> and
                Water <span lang="ko">水</span> — balance in you, and what your
                day master says about your character. Free, instant, no sign-up.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-5xl">
              <SajuStudio siteUrl={getSiteUrl().origin} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
