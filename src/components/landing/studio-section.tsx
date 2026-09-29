import { NameForm } from "@/components/name-form/name-form";
import { Eyebrow } from "@/components/ui/eyebrow";

export function StudioSection() {
  return (
    <section
      id="studio"
      aria-labelledby="studio-title"
      className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center text-center">
          <Eyebrow hangul="이름 공방">The studio</Eyebrow>
          <h2
            id="studio-title"
            className="mt-5 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            Tell us a little about you
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
            Five details are all it takes. Don’t know your birth hour? Just tick
            “I don’t know” — the hour only adds the fourth pillar.
          </p>
        </div>

        <div className="mt-12 rounded-[2rem] border border-ink/10 bg-white/60 p-6 shadow-xl shadow-ink/5 backdrop-blur-sm sm:p-10">
          <NameForm />
        </div>
      </div>
    </section>
  );
}
