"use client";

import { useState, type ChangeEvent, type CompositionEvent } from "react";

import { describedBy, Field, FieldGroup } from "@/components/ui/field";
import {
  choiceCardClass,
  choiceIndicatorClass,
  inputClass,
} from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { parseSealText, SEAL_SHAPES, type SealShape } from "@/lib/seal";

import { KoreanSeal } from "./korean-seal";
import {
  DEFAULT_SEAL_FONT,
  SEAL_FONT_IDS,
  SEAL_FONTS,
  type SealFontId,
} from "./seal-fonts";

const SAMPLE_NAMES = ["민준", "김서윤", "남궁민수"] as const;
const NAME_INPUT_ID = "seal-name";

const SHAPE_LABELS: Record<SealShape, { label: string; hangul: string }> = {
  square: { label: "Square", hangul: "사각" },
  circle: { label: "Round", hangul: "원형" },
};

/** 도장 체험: 이름·모양·서체를 고르면 바로 미리 보고 내려받는다 */
export function SealStudio() {
  const [draft, setDraft] = useState<string>(SAMPLE_NAMES[1]);
  // 한글 입력기(IME) 조합 중인 글자(ㄱ, 기 …)로는 도장을 다시 그리지 않는다
  const [name, setName] = useState<string>(SAMPLE_NAMES[1]);
  const [shape, setShape] = useState<SealShape>("square");
  const [fontId, setFontId] = useState<SealFontId>(DEFAULT_SEAL_FONT);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    if (!(event.nativeEvent as InputEvent).isComposing) {
      setName(event.target.value);
    }
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
  };

  const pickSample = (sample: string) => {
    setDraft(sample);
    setName(sample);
  };

  const parsed = parseSealText(name);
  const nameError =
    !parsed.ok && parsed.error !== "empty" ? parsed.message : undefined;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
      <div className="flex flex-col gap-8">
        <Field
          id={NAME_INPUT_ID}
          label="Name in Hangul"
          hangul="한글 이름"
          hint="1–4 Hangul syllables. No Korean keyboard? Pick a sample below."
          error={nameError}
        >
          <input
            id={NAME_INPUT_ID}
            type="text"
            lang="ko"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. 김민준"
            value={draft}
            onChange={handleChange}
            onCompositionEnd={handleCompositionEnd}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={describedBy(NAME_INPUT_ID, {
              hint: true,
              error: Boolean(nameError),
            })}
            className={cn(inputClass, "font-serif text-lg")}
          />
          <div className="flex flex-wrap gap-2">
            {SAMPLE_NAMES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => pickSample(sample)}
                aria-pressed={name === sample}
                className="rounded-full border border-ink/15 bg-white/70 px-4 py-1.5 font-serif text-sm text-ink transition hover:border-vermilion hover:text-vermilion focus-visible:ring-4 focus-visible:ring-vermilion/20 focus-visible:outline-hidden aria-pressed:border-vermilion aria-pressed:bg-vermilion/5 aria-pressed:text-vermilion"
                lang="ko"
              >
                {sample}
              </button>
            ))}
          </div>
        </Field>

        <FieldGroup id="seal-shape" label="Shape" hangul="모양">
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            {SEAL_SHAPES.map((option) => (
              <label
                key={option}
                className={cn(
                  choiceCardClass,
                  "flex items-center gap-3 px-4 py-3",
                )}
              >
                <input
                  type="radio"
                  name="seal-shape"
                  value={option}
                  checked={shape === option}
                  onChange={() => setShape(option)}
                  className="sr-only"
                />
                <span aria-hidden="true" className={choiceIndicatorClass} />
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-6 border-[3px] border-vermilion",
                    option === "circle" ? "rounded-full" : "rounded-[3px]",
                  )}
                />
                <span className="text-sm font-semibold text-ink">
                  {SHAPE_LABELS[option].label}
                </span>
                <span lang="ko" className="font-serif text-sm text-ink-muted">
                  {SHAPE_LABELS[option].hangul}
                </span>
              </label>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup id="seal-font" label="Lettering" hangul="서체">
          <div className="grid gap-3 sm:grid-cols-3">
            {SEAL_FONT_IDS.map((id) => {
              const preset = SEAL_FONTS[id];
              return (
                <label
                  key={id}
                  className={cn(choiceCardClass, "flex flex-col gap-1 p-4")}
                >
                  <input
                    type="radio"
                    name="seal-font"
                    value={id}
                    checked={fontId === id}
                    onChange={() => setFontId(id)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className={choiceIndicatorClass} />
                  <span className="flex items-baseline gap-2 pr-4">
                    <span className="text-sm font-semibold text-ink">
                      {preset.label}
                    </span>
                    <span
                      lang="ko"
                      className="font-serif text-sm text-ink-muted"
                    >
                      {preset.hangul}
                    </span>
                  </span>
                  <span className="text-xs leading-relaxed text-ink-muted">
                    {preset.description}
                  </span>
                </label>
              );
            })}
          </div>
        </FieldGroup>
      </div>

      <KoreanSeal
        name={name}
        shape={shape}
        font={fontId}
        showInputError={false}
        className="lg:w-80"
      />
    </div>
  );
}
