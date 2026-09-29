"use client";

import { useEffect } from "react";

import { AdSlot } from "@/components/ads/ad-slot";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  ANALYTICS_EVENTS,
  premiumEcommerce,
  trackOnce,
} from "@/lib/analytics/track";
import { formatPrice } from "@/lib/pricing";
import type { FreeReadingView } from "@/types/reading";

import { LockIcon } from "./lock-icon";
import { LockedSection } from "./locked-section";
import { PaywallCard } from "./paywall-card";
import { useCheckout } from "./use-checkout";

/** 결제 복귀·취소 안내 */
export type FreeReadingNotice = "cancelled" | "confirming" | "confirm-timeout";

interface FreeReadingProps {
  view: FreeReadingView;
  notice: FreeReadingNotice | null;
}

/**
 * 무료 미리보기: 이름 1개(한글 · 영문 발음 · 한 줄 의미)만 실제 데이터다.
 * 잠긴 이름·사주 풀이·도장·증명서는 가짜 내용을 흐리게 보여 준다 — 서버는 프리미엄 데이터를 보내지 않는다.
 */
export function FreeReading({ view, notice }: FreeReadingProps) {
  const checkout = useCheckout(view.readingId);

  // 퍼널 2단계: 무료 결과와 결제 제안을 봤다 (풀이마다 한 번)
  useEffect(() => {
    trackOnce(
      `view_item:${view.readingId}`,
      ANALYTICS_EVENTS.viewOffer,
      premiumEcommerce(),
    );
  }, [view.readingId]);
  const priceLabel = formatPrice(view.offer);
  const { name } = view;
  const totalNames = view.lockedNameCount + 1;
  const syllables = Array.from(name.hangul).length;

  return (
    <div className="flex flex-col gap-12">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10">
        {/* 1. 무료 이름 + 잠긴 이름 */}
        <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-col gap-3">
            <Eyebrow hangul="무료 미리보기">Free preview</Eyebrow>
            <h1
              id="reading-title"
              className="font-serif text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl"
            >
              {view.englishName}, meet your Korean name
            </h1>
            <p className="max-w-2xl text-ink-soft">
              We read your Saju chart and crafted {totalNames} names. Here is
              the first one — the rest of your reading is waiting below.
            </p>
          </div>

          <NoticeBanner notice={notice} readingId={view.readingId} />

          <article
            aria-labelledby="free-name"
            className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white/85 p-8 shadow-xl shadow-ink/5 sm:p-10"
          >
            <div
              aria-hidden="true"
              className="saekdong absolute inset-y-0 left-0 w-1.5"
            />
            <span
              aria-hidden="true"
              lang="ko"
              className="pointer-events-none absolute -right-6 -bottom-12 font-serif text-[11rem] leading-none text-ink/[0.04]"
            >
              名
            </span>
            <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
              Name 1 of {totalNames} · Free
            </p>
            <p
              id="free-name"
              lang="ko"
              className="mt-4 font-serif text-6xl font-semibold tracking-tight text-ink sm:text-7xl"
            >
              {name.hangul}
            </p>
            <p className="mt-3 text-xl font-semibold tracking-wide text-ink-soft">
              {name.romanization}
            </p>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink">
              “{name.summary}”
            </p>
          </article>

          {view.lockedNameCount > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: view.lockedNameCount }, (_, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => checkout.start("locked_name")}
                    disabled={checkout.isRedirecting}
                    aria-label={`Name ${index + 2} is locked — unlock for ${priceLabel}`}
                    className="group flex w-full flex-col items-start gap-2 rounded-2xl border border-dashed border-ink/20 bg-white/60 p-5 text-left transition hover:border-vermilion hover:bg-white focus-visible:ring-4 focus-visible:ring-vermilion/20 focus-visible:outline-hidden disabled:cursor-wait"
                  >
                    <span className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
                      Name {index + 2}
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-serif text-4xl tracking-[0.2em] text-ink/70 blur-[7px] select-none"
                    >
                      {"●".repeat(syllables)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-vermilion">
                      <LockIcon /> Unlock to reveal
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* 2. 결제 카드 — 모바일은 이름 바로 아래, 데스크톱은 오른쪽에 고정 */}
        <PaywallCard
          offer={view.offer}
          lockedNameCount={view.lockedNameCount}
          checkout={checkout}
          className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />

        {/* 3. 잠긴 프리미엄 영역 */}
        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-2">
          <LockedSection
            id="locked-analysis"
            title="Saju & Hanja analysis"
            hangul="사주 · 한자 풀이"
            description="Your four pillars, the elements your name balances, the Hanja behind every syllable and your fortune reading."
            priceLabel={priceLabel}
            checkout={checkout}
            preview={<AnalysisPreview />}
          />
          <LockedSection
            id="locked-keepsakes"
            title="Seal & certificate"
            hangul="도장 · 증서"
            description="Download your name carved as a Korean seal (PNG) and a keepsake name certificate (PDF)."
            priceLabel={priceLabel}
            checkout={checkout}
            preview={<KeepsakePreview hangul={name.hangul} />}
          />
        </div>
      </div>

      {/* 광고는 결제 버튼과 멀리, 모든 내용이 끝난 뒤에만 */}
      <AdSlot placement="reading" className="mt-4" />
    </div>
  );
}

function NoticeBanner({
  notice,
  readingId,
}: {
  notice: FreeReadingNotice | null;
  readingId: string;
}) {
  if (!notice) return null;

  if (notice === "cancelled") {
    return (
      <p
        role="status"
        className="rounded-2xl border border-ink/15 bg-white/70 px-5 py-4 text-sm leading-relaxed text-ink-soft"
      >
        <strong className="text-ink">Checkout cancelled</strong> — you haven’t
        been charged. Your reading is saved, so you can unlock it anytime.
      </p>
    );
  }

  if (notice === "confirming") {
    return (
      <p
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-ochre/30 bg-ochre/10 px-5 py-4 text-sm text-ink"
      >
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-ochre border-t-transparent"
        />
        Confirming your payment with Stripe… this usually takes a few seconds.
      </p>
    );
  }

  return (
    <p
      role="alert"
      className="rounded-2xl border border-ochre/30 bg-ochre/10 px-5 py-4 text-sm leading-relaxed text-ink"
    >
      <strong>We’re still waiting for Stripe to confirm your payment.</strong>{" "}
      Some payment methods take a little longer. Refresh this page in a minute —
      your reading unlocks automatically. If you were charged and it stays
      locked, contact us with reference{" "}
      <code className="font-mono text-xs">{readingId}</code>.
    </p>
  );
}

/** 흐리게 보일 가짜 사주 풀이 — 실제 결과가 아니다 */
function AnalysisPreview() {
  const pillars = ["甲子", "丙寅", "戊辰", "庚午"];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-2">
        {pillars.map((pillar) => (
          <div
            key={pillar}
            className="rounded-xl border border-ink/10 bg-hanji/60 py-4 text-center font-serif text-2xl text-ink"
          >
            {pillar}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["Wood 2", "Fire 1", "Earth 3", "Metal 1", "Water 1"].map((label) => (
          <span
            key={label}
            className="rounded-full bg-ink/5 px-3 py-1 text-sm text-ink-soft"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-ink-soft">
        Your day master rises like a tall pine at the start of spring, rooted in
        rich earth. Water nourishes it and Fire gives it warmth, so the name
        leans on characters that carry gentle, flowing energy while the final
        syllable steadies the sound.
      </p>
      <p className="text-sm leading-relaxed text-ink-soft">
        Sound harmony flows from Wood to Fire to Earth, a generating cycle that
        reads as bright and warm. In the years ahead this balance favors study,
        friendships and a steady rise in reputation.
      </p>
    </div>
  );
}

/** 흐리게 보일 도장·증서 모양 — 한글 이름은 이미 공개된 무료 정보다 */
function KeepsakePreview({ hangul }: { hangul: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <div className="grid size-40 place-items-center rounded-2xl border-[6px] border-vermilion p-3">
        <span
          lang="ko"
          className="font-serif text-4xl leading-tight font-bold text-vermilion [writing-mode:vertical-rl]"
        >
          {hangul}
        </span>
      </div>
      <div className="flex h-44 w-64 flex-col items-center justify-center gap-2 rounded-xl border-4 border-double border-ochre bg-hanji p-4 text-center">
        <span className="text-[0.6rem] tracking-[0.3em] text-ink-muted uppercase">
          Certificate of Korean name
        </span>
        <span lang="ko" className="font-serif text-3xl text-ink">
          {hangul}
        </span>
        <span className="h-1.5 w-32 rounded bg-ink/15" />
        <span className="h-1.5 w-24 rounded bg-ink/10" />
      </div>
    </div>
  );
}
