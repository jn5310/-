import { Eyebrow } from "@/components/ui/eyebrow";
import { SealMark } from "@/components/ui/seal-mark";
import { ctaButtonClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/pricing";
import type { PremiumOffer } from "@/types/reading";

import { LockIcon } from "./lock-icon";
import type { CheckoutControls } from "./use-checkout";

interface PaywallCardProps {
  offer: PremiumOffer;
  /** 잠긴 이름 수 (보통 2) */
  lockedNameCount: number;
  checkout: CheckoutControls;
  className?: string;
}

/** 프리미엄 구매 카드 — 무엇이 열리는지 구체적으로 보여 주고, 결제 버튼은 하나만 크게 둔다 */
export function PaywallCard({
  offer,
  lockedNameCount,
  checkout,
  className,
}: PaywallCardProps) {
  const price = formatPrice(offer);
  const totalNames = lockedNameCount + 1;

  const features = [
    {
      hanja: "名",
      title: `All ${totalNames} names from your chart`,
      detail:
        "See every name we crafted and choose the one that feels like you.",
    },
    {
      hanja: "析",
      title: "Full Saju & Hanja analysis",
      detail:
        "Hanja meanings, element balance, sound harmony and your fortune — in English.",
    },
    {
      hanja: "印",
      title: "Your Korean seal · PNG",
      detail: "A transparent, print-ready seal carved with your new name.",
    },
    {
      hanja: "證",
      title: "Name certificate · PDF",
      detail: "A keepsake certificate with your name, Hanja and seal.",
    },
    {
      hanja: "淨",
      title: "Ad-free and saved for a year",
      detail: "No ads on your reading. Bookmark it and come back anytime.",
    },
  ] as const;

  return (
    <section
      id="unlock"
      aria-labelledby="paywall-title"
      className={cn(
        "relative isolate scroll-mt-24 overflow-hidden rounded-[2rem] border border-vermilion/25 bg-white/90 p-6 shadow-2xl shadow-vermilion/10 sm:p-8",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="saekdong absolute inset-x-0 top-0 h-1.5"
      />
      <span
        aria-hidden="true"
        lang="ko"
        className="pointer-events-none absolute -right-4 -bottom-10 -z-10 font-serif text-[10rem] leading-none text-vermilion/[0.05]"
      >
        福
      </span>

      <div className="flex items-start justify-between gap-4">
        <Eyebrow hangul="프리미엄">Premium reading</Eyebrow>
        <SealMark className="size-10 text-lg" />
      </div>

      <h2
        id="paywall-title"
        className="mt-4 font-serif text-2xl leading-snug font-semibold text-balance text-ink sm:text-3xl"
      >
        Unlock the full story of your Korean name
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Your Saju chart chose {totalNames} names — you’re seeing one of them.
      </p>

      <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-serif text-5xl font-semibold tracking-tight text-ink">
          {price}
        </span>
        <span className="text-sm font-medium text-ink-muted">
          one-time payment · no subscription
        </span>
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {features.map((feature) => (
          <li key={feature.hanja} className="flex gap-3">
            <span
              aria-hidden="true"
              lang="ko"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-vermilion/10 font-serif text-lg text-vermilion"
            >
              {feature.hanja}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink">
                {feature.title}
              </span>
              <span className="text-sm leading-relaxed text-ink-muted">
                {feature.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={checkout.start}
        disabled={checkout.isRedirecting}
        aria-busy={checkout.isRedirecting || undefined}
        className={cn(ctaButtonClass, "mt-8 w-full")}
      >
        {checkout.isRedirecting ? (
          "Opening secure checkout…"
        ) : (
          <>
            <LockIcon className="size-5" />
            Unlock everything — {price}
          </>
        )}
      </button>

      <p
        role="alert"
        className={cn(
          "text-center text-sm text-vermilion",
          checkout.error ? "mt-3" : "sr-only",
        )}
      >
        {checkout.error}
      </p>

      <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <LockIcon className="size-3.5" /> Secure checkout by Stripe
        </li>
        <li>Instant unlock</li>
        <li>You’ll come right back here</li>
      </ul>
    </section>
  );
}
