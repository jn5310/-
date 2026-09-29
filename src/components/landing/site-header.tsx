import { SealMark } from "@/components/ui/seal-mark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-hanji/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-hanji"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="/" className="flex items-center gap-3">
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
        </a>

        <nav aria-label="Primary">
          <ul className="flex items-center gap-2 text-sm font-medium sm:gap-6">
            <li className="hidden sm:block">
              <a
                href="/#how-it-works"
                className="text-ink-soft transition-colors hover:text-vermilion"
              >
                How it works
              </a>
            </li>
            <li className="hidden sm:block">
              <a
                href="/#seal"
                className="text-ink-soft transition-colors hover:text-vermilion"
              >
                Name seal
              </a>
            </li>
            <li>
              <a
                href="/#studio"
                className="inline-flex items-center rounded-full border border-ink/15 bg-white/60 px-4 py-2 text-ink transition hover:border-vermilion hover:text-vermilion"
              >
                Start naming
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div aria-hidden="true" className="saekdong h-1 opacity-80" />
    </header>
  );
}
