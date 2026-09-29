import { Eyebrow } from "@/components/ui/eyebrow";
import { SealMark } from "@/components/ui/seal-mark";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

const HIGHLIGHTS = [
  { hanja: "四柱", label: "Saju reading" },
  { hanja: "五行", label: "Element balance" },
  { hanja: "漢字", label: "Meaningful Hanja" },
] as const;

/** 예시 이름: 김서윤(金瑞允) — 瑞 상서 서, 允 진실로 윤 */
const SAMPLE_NAME = [
  { hanja: "金", hangul: "김", meaning: "Gold · surname" },
  { hanja: "瑞", hangul: "서", meaning: "Auspicious" },
  { hanja: "允", hangul: "윤", meaning: "Sincere" },
] as const;

export function HeroSection() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="lattice absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20 lg:pb-28">
        <div className="motion-safe:animate-rise">
          <Eyebrow hangul="한국 이름 짓기">Korean naming studio</Eyebrow>

          <h1
            id="hero-title"
            className="mt-6 font-serif text-4xl leading-[1.15] font-semibold tracking-tight text-balance text-ink sm:text-5xl lg:text-6xl"
          >
            The Korean name you were{" "}
            <span className="text-vermilion">born for</span>.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            We read your birth date and hour through Saju (
            <span lang="ko">사주</span>) — the Four Pillars of Destiny — then
            pair the elements you need with meaningful Hanja, crafting a name
            that sounds natural in Korean and still feels like you.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#studio" className={primaryButtonClass}>
              Find my Korean name <span aria-hidden="true">→</span>
            </a>
            <a href="#how-it-works" className={secondaryButtonClass}>
              How it works
            </a>
          </div>

          <ul className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-ink/10 pt-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.hanja} className="flex flex-col gap-1">
                <span lang="ko" className="font-serif text-2xl text-ink">
                  {item.hanja}
                </span>
                <span className="text-xs font-medium tracking-[0.12em] text-ink-muted uppercase">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <SampleNameCard />
      </div>
    </section>
  );
}

function SampleNameCard() {
  return (
    <figure className="relative isolate mx-auto w-full max-w-sm motion-safe:animate-rise motion-safe:[animation-delay:150ms]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 translate-x-3 translate-y-3 rotate-2 rounded-[2rem] bg-hanji-deep"
      />

      <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white/85 p-8 shadow-2xl shadow-ink/10">
        <div
          aria-hidden="true"
          className="saekdong absolute inset-y-0 left-0 w-1.5"
        />
        <span
          aria-hidden="true"
          lang="ko"
          className="pointer-events-none absolute -right-6 -bottom-10 font-serif text-[11rem] leading-none text-ink/[0.04]"
        >
          名
        </span>

        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
            Sample name
          </p>
          <SealMark className="size-11 text-xl" />
        </div>

        <ol className="mt-6 flex flex-col gap-4">
          {SAMPLE_NAME.map((character) => (
            <li key={character.hanja} className="flex items-center gap-5">
              <span
                lang="ko"
                className="w-14 font-serif text-5xl leading-none text-ink"
              >
                {character.hanja}
              </span>
              <span className="flex flex-col">
                <span lang="ko" className="font-serif text-xl text-ink">
                  {character.hangul}
                </span>
                <span className="text-sm text-ink-muted">
                  {character.meaning}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <figcaption className="mt-8 border-t border-ink/10 pt-5">
          <span className="block font-serif text-2xl text-ink">
            Kim Seo-yun
          </span>
          <span className="mt-1 block text-sm text-ink-muted">
            “Auspicious and sincere” —{" "}
            <span lang="ko" className="font-serif">
              김서윤 · 金瑞允
            </span>
          </span>
        </figcaption>
      </div>
    </figure>
  );
}
