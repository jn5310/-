import { cn } from "@/lib/cn";
import { FIVE_ELEMENT_META } from "@/lib/saju/five-elements";
import type {
  FiveElement,
  SajuNote,
  SajuPillar,
  SajuReading,
} from "@/types/saju";

/*
 * 사주 원국(四柱 原局) 카드 — 네 기둥 · 일간 · 오행 분포 · 계산 참고 사항.
 * 이름 풀이(프리미엄 화면)와 사주 분석(사주 전용 메뉴)이 함께 쓴다.
 */

/** 전통 표기 순서: 오른쪽부터 연·월·일·시 — 화면에서는 왼쪽부터 시·일·월·연으로 놓는다 */
const PILLAR_ORDER = [
  { key: "hour", label: "Hour", hanja: "時" },
  { key: "day", label: "Day", hanja: "日" },
  { key: "month", label: "Month", hanja: "月" },
  { key: "year", label: "Year", hanja: "年" },
] as const;

const NOTE_MESSAGES: Record<SajuNote, string> = {
  "hour-unknown": "Birth hour unknown — your chart is read from three pillars.",
  "late-zi-hour":
    "Born after 23:00 — by tradition the day pillar moves to the next day.",
  "dst-removed": "Daylight saving time was removed to use standard time.",
  "near-solar-term":
    "Born close to a solar-term change — the month pillar is sensitive.",
  "solar-term-day":
    "Born on a solar-term day with an unknown hour — the month pillar may differ.",
  "ambiguous-time":
    "Your birth time fell in a daylight-saving change, so it may be off by an hour.",
};

export function SajuChartCard({ saju }: { saju: SajuReading }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white/70 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
          Your Saju chart <span lang="ko">· 사주 원국</span>
        </p>
        <p className="text-sm text-ink-soft">
          Day master{" "}
          <strong lang="ko" className="font-serif text-ink">
            {saju.dayMaster.hanja}
          </strong>{" "}
          · {saju.dayMaster.yinYang}{" "}
          {FIVE_ELEMENT_META[saju.dayMaster.element].label}
        </p>
      </div>
      <dl className="grid grid-cols-4 gap-2">
        {PILLAR_ORDER.map(({ key, label, hanja }) => (
          <PillarCell
            key={key}
            label={label}
            hanja={hanja}
            pillar={saju.chart[key]}
          />
        ))}
      </dl>
      <ElementBalance balance={saju.elementBalance} />
      {saju.notes.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs leading-relaxed text-ink-muted">
          {saju.notes.map((note) => (
            <li key={note}>• {NOTE_MESSAGES[note]}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PillarCell({
  label,
  hanja,
  pillar,
}: {
  label: string;
  hanja: string;
  pillar: SajuPillar | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-ink/10 bg-hanji/60 px-2 py-3 text-center">
      <dt className="text-[0.7rem] font-semibold tracking-[0.12em] text-ink-muted uppercase">
        {label} <span lang="ko">{hanja}</span>
      </dt>
      <dd className="flex flex-col items-center">
        {pillar ? (
          <>
            <span
              lang="ko"
              className="font-serif text-2xl leading-tight text-ink"
            >
              {pillar.hanja}
            </span>
            <span lang="ko" className="text-xs text-ink-muted">
              {pillar.hangul}
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="font-serif text-2xl leading-tight text-ink/25"
            >
              ？
            </span>
            <span className="text-xs text-ink-muted">unknown</span>
          </>
        )}
      </dd>
    </div>
  );
}

function ElementBalance({ balance }: { balance: Record<FiveElement, number> }) {
  const entries = Object.entries(FIVE_ELEMENT_META) as [
    FiveElement,
    (typeof FIVE_ELEMENT_META)[FiveElement],
  ][];
  return (
    <ul
      className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-soft"
      aria-label="Five-element balance"
    >
      {entries.map(([element, meta]) => (
        <li key={element} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "size-3 rounded-full border border-ink/20",
              meta.swatchClass,
            )}
          />
          {meta.label} <span lang="ko">{meta.hanja}</span>
          <strong className="text-ink">{balance[element]}</strong>
        </li>
      ))}
    </ul>
  );
}
