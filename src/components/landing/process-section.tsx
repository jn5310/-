import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";
import { FIVE_ELEMENT_META, FIVE_ELEMENTS } from "@/lib/saju/five-elements";

/** 전통 작명(作名)의 네 단계 */
const STEPS = [
  {
    hanja: "四柱",
    hangul: "사주",
    title: "Read your Four Pillars",
    body: "Your birth year, month, day and hour become four pairs of heavenly stems and earthly branches.",
  },
  {
    hanja: "五行",
    hangul: "오행",
    title: "Balance the five elements",
    body: "We weigh wood, fire, earth, metal and water in your chart to find the energy your name should bring.",
  },
  {
    hanja: "漢字",
    hangul: "한자",
    title: "Choose meaningful Hanja",
    body: "Characters are picked for their meaning, their element and the stroke harmony (수리) they make with your surname.",
  },
  {
    hanja: "音韻",
    hangul: "음운",
    title: "Tune the sound",
    body: "Finally, the name is shaped to flow naturally in Korean — and to echo the sound of the name you use today.",
  },
] as const;

export function ProcessSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="scroll-mt-20 border-y border-ink/10 bg-white/40"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <Eyebrow hangul="작명 원리">How it works</Eyebrow>
          <h2
            id="how-it-works-title"
            className="mt-5 font-serif text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl"
          >
            From the moment you were born to a name that fits
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Korean naming (<span lang="ko">작명, 作名</span>) has long balanced
            destiny, meaning and sound. We follow the same principles — and
            explain every choice along the way.
          </p>
        </div>

        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li
              key={step.hanja}
              className="flex flex-col gap-4 rounded-3xl border border-ink/10 bg-hanji/80 p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="text-xs font-semibold tracking-[0.2em] text-ink-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span lang="ko" className="font-serif text-4xl text-vermilion">
                {step.hanja}
              </span>
              <h3 className="font-serif text-xl font-semibold text-ink">
                {step.title}{" "}
                <span
                  lang="ko"
                  className="text-sm font-normal whitespace-nowrap text-ink-muted"
                >
                  {step.hangul}
                </span>
              </h3>
              <p className="text-sm leading-relaxed text-ink-soft">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <p className="text-sm font-semibold text-ink">
            The five elements{" "}
            <span lang="ko" className="font-serif font-normal text-ink-muted">
              오행 · 五行
            </span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {FIVE_ELEMENTS.map((element) => {
              const meta = FIVE_ELEMENT_META[element];

              return (
                <li
                  key={element}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm text-ink"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-3 rounded-full ring-1 ring-ink/20",
                      meta.swatchClass,
                    )}
                  />
                  <span lang="ko" className="font-serif">
                    {meta.hanja}
                  </span>
                  {meta.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
