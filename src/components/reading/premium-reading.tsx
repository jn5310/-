"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { SajuChartCard } from "@/components/saju/saju-chart";
import { KoreanSeal } from "@/components/seal/korean-seal";
import {
  DEFAULT_SEAL_FONT,
  SEAL_FONT_IDS,
  SEAL_FONTS,
  type SealFontId,
} from "@/components/seal/seal-fonts";
import { Eyebrow } from "@/components/ui/eyebrow";
import { secondaryButtonClass } from "@/components/ui/styles";
import { FIVE_ELEMENT_META } from "@/lib/saju/five-elements";
import { SEAL_SHAPES, type SealShape } from "@/lib/seal";
import type { GeneratedName } from "@/types/api";
import type { PremiumReadingView } from "@/types/reading";

import { CertificateButton } from "./certificate-button";

interface PremiumReadingProps {
  view: PremiumReadingView;
  /** 방금 결제를 마치고 열린 경우 — 감사 인사를 보여 주고 제목으로 포커스를 옮긴다 */
  justUnlocked: boolean;
}

const SHAPE_LABELS: Record<SealShape, string> = {
  square: "Square",
  circle: "Round",
};

// 서버와 브라우저가 같은 문자열을 만들도록 언어·시간대를 고정한다 (하이드레이션 불일치 방지)
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

function formatDate(isoTime: string): string {
  return DATE_FORMAT.format(new Date(isoTime));
}

/**
 * 전체 풀이: 사주 원국 → 추천 이름 3개 → 고른 이름의 풀이 · 도장 PNG · 증명서 PDF (광고 없음).
 * 결제로 열린 풀이(access: "purchased")와 무료 개방 기간의 풀이(access: "open")가 같은 화면을 쓴다.
 */
export function PremiumReading({ view, justUnlocked }: PremiumReadingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shape, setShape] = useState<SealShape>("square");
  const [fontId, setFontId] = useState<SealFontId>(DEFAULT_SEAL_FONT);

  // 잠금이 풀리며 화면이 바뀌었음을 스크린리더 사용자에게도 알리도록 제목으로 포커스를 옮긴다
  useEffect(() => {
    if (justUnlocked) headingRef.current?.focus();
  }, [justUnlocked]);

  const { names, favorableElements, saju } = view.result;
  const selected: GeneratedName | undefined = names[selectedIndex] ?? names[0];

  return (
    <section aria-labelledby="reading-title" className="flex flex-col gap-10">
      {justUnlocked ? (
        <p
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-wood/30 bg-wood/10 px-5 py-4 text-sm text-ink"
        >
          <span
            aria-hidden="true"
            lang="ko"
            className="font-serif text-2xl text-wood"
          >
            福
          </span>
          <span>
            <strong>Payment complete — thank you!</strong> Your full reading,
            seal and certificate are unlocked.
          </span>
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {view.access === "purchased" ? (
          <Eyebrow hangul="프리미엄 풀이">Premium reading</Eyebrow>
        ) : (
          <Eyebrow hangul="이름 풀이">Free full reading</Eyebrow>
        )}
        <h1
          id="reading-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-3xl font-semibold tracking-tight text-ink outline-hidden sm:text-4xl"
        >
          Three Korean names for {view.englishName}
        </h1>
        <p className="max-w-2xl text-ink-soft">
          Each name balances your chart with{" "}
          {favorableElements.map((element, index) => (
            <span key={element}>
              {index > 0 ? " and " : null}
              <strong className="text-ink">
                {FIVE_ELEMENT_META[element].label}
              </strong>{" "}
              <span lang="ko">({FIVE_ELEMENT_META[element].hanja})</span>
            </span>
          ))}
          . Pick one to see its full reading, carve it as a seal and download
          your certificate.
        </p>
      </div>

      <SajuChartCard saju={saju} />

      {/* 추천 이름 3개 */}
      <div
        role="group"
        aria-label="Suggested names"
        className="grid gap-3 sm:grid-cols-3"
      >
        {names.map((name, index) => (
          <button
            key={name.hangul}
            type="button"
            aria-pressed={index === selectedIndex}
            onClick={() => setSelectedIndex(index)}
            className="group relative flex flex-col items-start gap-1 rounded-2xl border border-ink/12 bg-white/70 p-5 text-left transition hover:border-ink/30 hover:bg-white focus-visible:ring-4 focus-visible:ring-vermilion/20 focus-visible:outline-hidden aria-pressed:border-vermilion aria-pressed:bg-vermilion/5 aria-pressed:shadow-[0_0_0_1px_var(--color-vermilion)]"
          >
            <span
              aria-hidden="true"
              className="absolute top-3 right-3 size-2 rounded-full bg-vermilion opacity-0 transition-opacity group-aria-pressed:opacity-100"
            />
            <span
              lang="ko"
              className="font-serif text-3xl font-semibold text-ink"
            >
              {name.hangul}
            </span>
            <span lang="ko" className="font-serif text-base text-ink-muted">
              {name.hanja}
            </span>
            <span className="text-sm font-semibold tracking-wide text-ink-soft">
              {name.romanization}
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_auto]">
          <NameDetail name={selected} />

          <div className="flex flex-col items-center gap-4 lg:w-80">
            <KoreanSeal name={selected.hangul} shape={shape} font={fontId} />
            <CertificateButton
              readingId={view.readingId}
              englishName={view.englishName}
              name={selected}
              saju={saju}
              favorableElements={favorableElements}
              issuedAt={view.unlockedAt}
              seal={{ shape, font: SEAL_FONTS[fontId].font }}
            />
            <div
              className="flex flex-wrap justify-center gap-2"
              role="group"
              aria-label="Seal shape"
            >
              {SEAL_SHAPES.map((option) => (
                <ToggleChip
                  key={option}
                  pressed={shape === option}
                  onClick={() => setShape(option)}
                >
                  {SHAPE_LABELS[option]}
                </ToggleChip>
              ))}
            </div>
            <div
              className="flex flex-wrap justify-center gap-2"
              role="group"
              aria-label="Seal lettering"
            >
              {SEAL_FONT_IDS.map((id) => (
                <ToggleChip
                  key={id}
                  pressed={fontId === id}
                  onClick={() => setFontId(id)}
                >
                  {SEAL_FONTS[id].label}{" "}
                  <span lang="ko" className="font-serif text-ink-muted">
                    {SEAL_FONTS[id].hangul}
                  </span>
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-ink/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          Bookmark this page — your reading stays here until{" "}
          <time dateTime={view.expiresAt}>{formatDate(view.expiresAt)}</time>.
          Download your seal and certificate to keep them for good.
        </p>
        <Link href="/#studio" className={secondaryButtonClass}>
          Create another name
        </Link>
      </div>
    </section>
  );
}

function NameDetail({ name }: { name: GeneratedName }) {
  return (
    <article
      aria-label={`About ${name.romanization}`}
      className="flex flex-col gap-6"
    >
      <p className="text-lg leading-relaxed text-ink">{name.summary}</p>

      <table className="w-full overflow-hidden rounded-2xl border border-ink/10 bg-white/70 text-left text-sm">
        <caption className="sr-only">Character by character</caption>
        <thead className="bg-ink/5 text-xs tracking-[0.12em] text-ink-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">
              Character
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              Meaning
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              Element
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              Sound
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10">
          {name.characters.map((character, index) => (
            <tr key={`${character.hangul}-${index}`}>
              <td className="px-4 py-3">
                <span lang="ko" className="font-serif text-xl text-ink">
                  {character.hangul} {character.hanja}
                </span>
                {character.isSurname ? (
                  <span className="ml-2 text-xs text-ink-muted">surname</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-ink-soft">{character.meaning}</td>
              <td className="px-4 py-3 text-ink-soft">
                {FIVE_ELEMENT_META[character.element].label}
              </td>
              <td className="px-4 py-3 text-ink-soft">
                {FIVE_ELEMENT_META[character.soundElement].label}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {name.premium ? (
        <details className="rounded-2xl border border-ochre/30 bg-white/60 px-5 py-4 text-sm leading-relaxed text-ink-soft">
          <summary className="cursor-pointer font-semibold text-ink">
            Full reading{" "}
            <span lang="ko" className="font-serif font-normal text-ink-muted">
              상세 풀이
            </span>
          </summary>
          <dl className="mt-4 flex flex-col gap-4">
            <div>
              <dt className="font-semibold text-ink">Saju harmony</dt>
              <dd className="mt-1">{name.premium.sajuHarmony}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Sound harmony</dt>
              <dd className="mt-1">{name.premium.soundHarmony}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Fortune</dt>
              <dd className="mt-1">{name.premium.fortune}</dd>
            </div>
          </dl>
        </details>
      ) : null}
    </article>
  );
}

function ToggleChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="rounded-full border border-ink/15 bg-white/70 px-4 py-1.5 text-sm text-ink transition hover:border-vermilion hover:text-vermilion focus-visible:ring-4 focus-visible:ring-vermilion/20 focus-visible:outline-hidden aria-pressed:border-vermilion aria-pressed:bg-vermilion/5 aria-pressed:text-vermilion"
    >
      {children}
    </button>
  );
}
