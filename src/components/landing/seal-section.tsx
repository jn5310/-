import { SealStudio } from "@/components/seal/seal-studio";
import { Eyebrow } from "@/components/ui/eyebrow";

export function SealSection() {
  return (
    <section
      id="seal"
      aria-labelledby="seal-title"
      className="scroll-mt-20 border-t border-ink/10 bg-white/40 px-5 py-20 sm:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <Eyebrow hangul="이름 도장">Name seal</Eyebrow>
          <h2
            id="seal-title"
            className="mt-5 font-serif text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl"
          >
            Take your Korean name home as a seal
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            In Korea, a personal seal (<span lang="ko">도장, 圖章</span>) signs
            everything from letters to contracts. Try the carving below —
            Premium readings include your seal as a transparent, print-ready
            PNG.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Seals follow the traditional order: read the right column first,
            from top to bottom.
          </p>
        </div>

        <div className="mt-12 rounded-[2rem] border border-ink/10 bg-hanji/70 p-6 shadow-xl shadow-ink/5 sm:p-10">
          <SealStudio />
        </div>
      </div>
    </section>
  );
}
