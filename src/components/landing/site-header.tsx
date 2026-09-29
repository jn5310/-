import Link from "next/link";

import { SealMark } from "@/components/ui/seal-mark";
import { cn } from "@/lib/cn";

interface SiteHeaderProps {
  /** 지금 보고 있는 메뉴 — 해당 항목을 강조하고 aria-current로 알린다 */
  current?: "saju";
}

export function SiteHeader({ current }: SiteHeaderProps = {}) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-hanji/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-hanji"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <SealMark className="size-9 text-lg" />
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-lg font-semibold tracking-tight text-ink">
              K-Name Studio
            </span>
            <span
              lang="ko"
              className="text-[0.7rem] tracking-[0.3em] text-ink-muted"
            >
              한국 이름 공방
            </span>
          </span>
        </Link>

        <nav aria-label="Primary">
          <ul className="flex items-center gap-2 text-sm font-medium sm:gap-6">
            <li className="hidden sm:block">
              <Link
                href="/#how-it-works"
                className="text-ink-soft transition-colors hover:text-vermilion"
              >
                How it works
              </Link>
            </li>
            <li className="hidden sm:block">
              <Link
                href="/#seal"
                className="text-ink-soft transition-colors hover:text-vermilion"
              >
                Name seal
              </Link>
            </li>
            {/* 사주 전용 메뉴 — 이름 추천 없이 사주 분석만 (모바일에서도 보인다) */}
            <li>
              <Link
                href="/saju"
                aria-current={current === "saju" ? "page" : undefined}
                className={cn(
                  "transition-colors hover:text-vermilion",
                  current === "saju"
                    ? "text-vermilion underline decoration-2 underline-offset-8"
                    : "text-ink-soft",
                )}
              >
                <span className="sm:hidden">Saju</span>
                <span className="hidden sm:inline">Saju reading</span>
                <span
                  lang="ko"
                  className="ml-1.5 hidden font-serif text-ink-muted lg:inline"
                >
                  사주
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/#studio"
                className="inline-flex items-center rounded-full border border-ink/15 bg-white/60 px-4 py-2 text-ink transition hover:border-vermilion hover:text-vermilion"
              >
                Start naming
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div aria-hidden="true" className="saekdong h-1 opacity-80" />
    </header>
  );
}
