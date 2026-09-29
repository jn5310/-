import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { LockIcon } from "./lock-icon";
import type { CheckoutControls } from "./use-checkout";

interface LockedSectionProps {
  id: string;
  title: string;
  hangul: string;
  description: string;
  priceLabel: string;
  checkout: CheckoutControls;
  /**
   * 흐리게 보여 줄 가짜 내용 — 실제 프리미엄 데이터를 넣지 않는다.
   * 블러는 CSS일 뿐이라 개발자 도구로 걷어 낼 수 있기 때문이다.
   */
  preview: ReactNode;
  className?: string;
}

/** 잠긴 프리미엄 영역: 흐린 미리보기 위에 잠금 안내와 결제 버튼을 올린다 */
export function LockedSection({
  id,
  title,
  hangul,
  description,
  priceLabel,
  checkout,
  preview,
  className,
}: LockedSectionProps) {
  const titleId = `${id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "relative isolate overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white/70",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none min-h-72 p-6 blur-[6px] saturate-50 select-none sm:p-8"
      >
        {preview}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-b from-hanji/30 via-hanji/70 to-hanji/90 p-6 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-hanji shadow-lg shadow-ink/20">
          <LockIcon className="size-5" />
        </span>
        <h3
          id={titleId}
          className="flex flex-wrap items-baseline justify-center gap-x-2 font-serif text-xl font-semibold text-ink"
        >
          {title}
          <span lang="ko" className="text-base font-normal text-ink-muted">
            {hangul}
          </span>
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
        <button
          type="button"
          onClick={checkout.start}
          disabled={checkout.isRedirecting}
          className="mt-1 inline-flex items-center gap-2 rounded-full border border-vermilion bg-white/90 px-5 py-2.5 text-sm font-semibold text-vermilion transition hover:bg-vermilion hover:text-hanji focus-visible:ring-4 focus-visible:ring-vermilion/25 focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60"
        >
          <LockIcon />
          {checkout.isRedirecting
            ? "Opening checkout…"
            : `Unlock · ${priceLabel}`}
        </button>
      </div>
    </section>
  );
}
