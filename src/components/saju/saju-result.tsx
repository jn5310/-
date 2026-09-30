import Link from "next/link";
import type { Ref } from "react";

import { ShareLinkActions } from "@/components/share/share-link-actions";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { FIVE_ELEMENT_META } from "@/lib/saju/five-elements";
import { buildShareUrl, sajuShareText } from "@/lib/share";
import { SITE_NAME } from "@/lib/site";
import type {
  DayMasterStrength,
  ElementInsight,
  ElementLevel,
  ElementTip,
  SajuResult,
} from "@/types/saju";

import { SajuChartCard } from "./saju-chart";

const LEVEL_LABELS: Record<ElementLevel, string> = {
  missing: "Missing",
  low: "Light",
  balanced: "Balanced",
  strong: "Strong",
  dominant: "Dominant",
};

const LEVEL_BADGE: Record<ElementLevel, string> = {
  missing: "border-vermilion/40 text-vermilion-deep",
  low: "border-ochre/40 text-ochre-deep",
  balanced: "border-wood/40 text-wood",
  strong: "border-ink/30 text-ink",
  dominant: "border-ink bg-ink text-hanji",
};

const STRENGTH_LABELS: Record<DayMasterStrength, { en: string; ko: string }> = {
  strong: { en: "Strong", ko: "신강" },
  balanced: { en: "Balanced", ko: "중화" },
  weak: { en: "Gentle", ko: "신약" },
};

interface SajuResultViewProps {
  result: SajuResult;
  /** 결과가 나오면 제목으로 포커스를 옮긴다 (스크린리더에 화면이 바뀌었음을 알린다) */
  headingRef: Ref<HTMLHeadingElement>;
  /** 공유 링크의 사이트 주소 */
  siteUrl: string;
  onReset: () => void;
}

export function SajuResultView({
  result,
  headingRef,
  siteUrl,
  onReset,
}: SajuResultViewProps) {
  const { reading, analysis } = result;
  const { dayMaster } = analysis;
  const dayElement = FIVE_ELEMENT_META[dayMaster.element];
  const total = analysis.elements.reduce(
    (sum, insight) => sum + insight.count,
    0,
  );
  const { standardTime } = reading;

  return (
    <section
      aria-labelledby="saju-result-title"
      className="flex flex-col gap-10"
    >
      <div className="flex flex-col gap-3">
        <Eyebrow hangul="사주 풀이">Your Saju reading</Eyebrow>
        <h2
          id="saju-result-title"
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-24 font-serif text-3xl font-semibold tracking-tight text-balance text-ink outline-hidden sm:text-4xl"
        >
          <span lang="ko">{dayMaster.hanja}</span>{" "}
          {capitalize(dayMaster.yinYang)} {dayElement.label} — {dayMaster.image}
        </h2>
        <p className="text-sm text-ink-muted">
          Read from {standardTime.date}
          {standardTime.time ? ` ${standardTime.time}` : ""} (standard time, UTC
          {standardTime.utcOffset})
          {standardTime.time ? "" : " · birth hour unknown"}
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-8">
          {/* 총평 */}
          <article className="rounded-2xl border border-ink/10 bg-white/70 p-6">
            <h3 className="flex items-baseline gap-2 font-serif text-xl font-semibold text-ink">
              Overview
              <span lang="ko" className="text-base font-normal text-ink-muted">
                총평
              </span>
            </h3>
            <p className="mt-3 leading-relaxed text-ink-soft">
              {analysis.overview}
            </p>
          </article>

          {/* 일간 특성 */}
          <article className="flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white/70 p-6 sm:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-2 sm:w-28">
              <span
                aria-hidden="true"
                lang="ko"
                className={cn(
                  "grid size-20 place-items-center rounded-2xl font-serif text-5xl text-hanji shadow-md",
                  dayMaster.element === "metal"
                    ? "bg-ink"
                    : dayElement.swatchClass,
                )}
              >
                {dayMaster.hanja}
              </span>
              <span lang="ko" className="text-sm text-ink-muted">
                {dayMaster.hangul}
                {dayElement.hangul} · {dayMaster.imageKo}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="flex items-baseline gap-2 font-serif text-xl font-semibold text-ink">
                  Your character
                  <span
                    lang="ko"
                    className="text-base font-normal text-ink-muted"
                  >
                    일간 특성
                  </span>
                </h3>
                <p className="mt-2 leading-relaxed text-ink-soft">
                  {dayMaster.summary}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TraitList title="Strengths" items={dayMaster.strengths} />
                <TraitList title="Watch out for" items={dayMaster.challenges} />
              </div>
            </div>
          </article>
        </div>

        <SajuChartCard saju={reading} />
      </div>

      {/* 오행 분석 */}
      <section
        aria-labelledby="saju-elements-title"
        className="flex flex-col gap-4"
      >
        <h3
          id="saju-elements-title"
          className="flex items-baseline gap-2 font-serif text-2xl font-semibold text-ink"
        >
          Your five elements
          <span lang="ko" className="text-base font-normal text-ink-muted">
            오행 분석 · 목 화 토 금 수
          </span>
        </h3>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {analysis.elements.map((insight) => (
            <ElementCard
              key={insight.element}
              insight={insight}
              total={total}
            />
          ))}
        </ul>
      </section>

      {/* 균형 */}
      <section
        aria-labelledby="saju-balance-title"
        className="flex flex-col gap-4"
      >
        <h3
          id="saju-balance-title"
          className="flex items-baseline gap-2 font-serif text-2xl font-semibold text-ink"
        >
          Balance
          <span lang="ko" className="text-base font-normal text-ink-muted">
            균형
          </span>
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white/70 p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
              Day master strength{" "}
              <span lang="ko">
                · {STRENGTH_LABELS[analysis.strength.level].ko}
              </span>
            </p>
            <p className="font-serif text-2xl text-ink">
              {STRENGTH_LABELS[analysis.strength.level].en}
            </p>
            <Meter
              value={analysis.strength.support}
              max={analysis.strength.total}
              label={`${analysis.strength.support} of ${analysis.strength.total} points support your day master`}
            />
            <p className="text-sm leading-relaxed text-ink-soft">
              {analysis.strength.summary}
            </p>
            <p className="text-xs text-ink-muted">
              A simple estimate from your surface characters — the month branch
              counts double.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white/70 p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
              Yin &amp; yang <span lang="ko">· 음양</span>
            </p>
            <p className="font-serif text-2xl text-ink">
              {analysis.yinYang.yang} yang · {analysis.yinYang.yin} yin
            </p>
            <div
              aria-hidden="true"
              className="flex h-2.5 overflow-hidden rounded-full bg-ink/10"
            >
              <span
                className="bg-vermilion"
                style={{
                  width: `${share(analysis.yinYang.yang, total)}%`,
                }}
              />
              <span className="flex-1 bg-ink/70" />
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">
              {analysis.yinYang.summary}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-ochre/30 bg-white/60 p-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
              Elements that bring balance{" "}
              <span lang="ko">· 채우면 좋은 오행</span>
            </p>
            <p className="mt-2 leading-relaxed text-ink-soft">
              {analysis.balancing.summary}
            </p>
          </div>
          {analysis.balancing.tips.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {analysis.balancing.tips.map((tip) => (
                <TipCard key={tip.element} tip={tip} />
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* 공유 — 링크는 사주 분석 첫 화면 (생년월일은 보내지 않는다) */}
      <div className="flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white/70 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-xl font-semibold text-ink">
            Share your day master{" "}
            <span lang="ko" className="text-vermilion">
              {dayMaster.hanja}
            </span>
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
            Send the link to friends — they can read their own Four Pillars in a
            few seconds. Your birth details stay on this screen.
          </p>
        </div>
        <ShareLinkActions
          title={`My Saju reading — ${SITE_NAME}`}
          text={sajuShareText(dayMaster)}
          url={buildShareUrl(siteUrl, "saju_reading", "/saju")}
          contentType="saju_reading"
          className="shrink-0"
        />
      </div>

      {/* 이름 짓기로 잇기 */}
      <div className="flex flex-col items-start gap-4 rounded-[2rem] border border-ink/10 bg-hanji-deep/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="font-serif text-xl font-semibold text-ink">
            Carry these elements in a Korean name
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
            Our naming studio reads the same chart and picks Hanja whose
            elements balance it — free, with a seal and a certificate.
          </p>
        </div>
        <Link href="/#studio" className={primaryButtonClass}>
          Find my Korean name <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-ink-muted">
          For cultural interest and fun — not professional, medical or financial
          advice.
        </p>
        <button
          type="button"
          onClick={onReset}
          className={secondaryButtonClass}
        >
          Read another chart
        </button>
      </div>
    </section>
  );
}

function ElementCard({
  insight,
  total,
}: {
  insight: ElementInsight;
  total: number;
}) {
  const meta = FIVE_ELEMENT_META[insight.element];
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <span
            aria-hidden="true"
            className={cn(
              "size-3 rounded-full border border-ink/20",
              meta.swatchClass,
            )}
          />
          {meta.label}
          <span lang="ko" className="font-serif font-normal text-ink-muted">
            {meta.hangul} {meta.hanja}
          </span>
        </p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase",
            LEVEL_BADGE[insight.level],
          )}
        >
          {LEVEL_LABELS[insight.level]}
        </span>
      </div>
      <Meter
        value={insight.count}
        max={total}
        label={`${insight.count} of ${total} characters`}
        barClass={meta.swatchClass}
      />
      <p className="text-sm leading-relaxed text-ink-soft">{insight.summary}</p>
      <p className="text-xs text-ink-muted">{insight.virtue}</p>
    </li>
  );
}

function TipCard({ tip }: { tip: ElementTip }) {
  const meta = FIVE_ELEMENT_META[tip.element];
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-ink/10 bg-white/80 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <span
          aria-hidden="true"
          className={cn(
            "size-3 rounded-full border border-ink/20",
            meta.swatchClass,
          )}
        />
        {meta.label}{" "}
        <span lang="ko" className="font-serif font-normal text-ink-muted">
          {meta.hangul} {meta.hanja}
        </span>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-ink-soft">
        <dt className="text-ink-muted">Colors</dt>
        <dd>{tip.colors}</dd>
        <dt className="text-ink-muted">Direction</dt>
        <dd>{tip.direction}</dd>
        <dt className="text-ink-muted">Season</dt>
        <dd>{tip.season}</dd>
        <dt className="text-ink-muted">Try</dt>
        <dd>{tip.activities}</dd>
      </dl>
    </li>
  );
}

function TraitList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function Meter({
  value,
  max,
  label,
  barClass = "bg-vermilion",
}: {
  value: number;
  max: number;
  label: string;
  barClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2.5 flex-1 overflow-hidden rounded-full border border-ink/10 bg-ink/5"
      >
        <span
          className={cn("block h-full rounded-full", barClass)}
          style={{ width: `${share(value, max)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs text-ink-muted tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
}

function share(value: number, max: number): number {
  return max > 0 ? Math.round((value / max) * 100) : 0;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
