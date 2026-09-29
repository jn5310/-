"use client";

import { useWatch } from "react-hook-form";

import {
  describedBy,
  FieldError,
  fieldMessageIds,
  FieldGroup,
  FieldHint,
} from "@/components/ui/field";
import {
  choiceCardClass,
  choiceIndicatorClass,
  inputClass,
} from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { SURNAME_OPTIONS } from "@/lib/constants/surnames";
import { CUSTOM_SURNAME_CHOICE } from "@/types/name";

import { useNameFormContext } from "./use-name-form-context";

const GROUP_ID = "surname";
const CUSTOM_INPUT_ID = "surname-custom";

export function SurnameField() {
  const {
    control,
    register,
    formState: { errors },
  } = useNameFormContext();
  const choice = useWatch({ control, name: "surname.choice" });
  const isCustom = choice === CUSTOM_SURNAME_CHOICE;

  const choiceError = errors.surname?.choice?.message;
  const customError = errors.surname?.custom?.message;

  // 성씨가 바뀌면 복성 여부에 따라 '이름 자수' 검증도 다시 돌린다
  const choiceField = register("surname.choice", { deps: ["nameLength"] });
  const radioA11yProps = {
    "aria-invalid": choiceError ? true : undefined,
    "aria-describedby": choiceError
      ? fieldMessageIds(GROUP_ID).errorId
      : undefined,
  };

  return (
    <FieldGroup
      id={GROUP_ID}
      label="Korean surname"
      hangul="성씨"
      hint="Pick one of Korea’s most common surnames, or type your own."
      error={choiceError}
    >
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {SURNAME_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={cn(
              choiceCardClass,
              "flex flex-col items-center justify-center gap-1.5 overflow-hidden px-1 py-3.5 text-center",
            )}
          >
            <input
              type="radio"
              value={option.id}
              className="sr-only"
              {...radioA11yProps}
              {...choiceField}
            />
            <span
              aria-hidden="true"
              lang="ko"
              className="pointer-events-none absolute -right-1 -bottom-3 font-serif text-5xl leading-none text-ink/[0.06] transition-colors group-has-checked:text-vermilion/15"
            >
              {option.hanja}
            </span>
            <span
              lang="ko"
              className="relative font-serif text-2xl leading-none font-semibold text-ink"
            >
              {option.hangul}
            </span>
            <span className="relative text-xs font-medium tracking-wide text-ink-muted">
              {option.romanization}
            </span>
          </label>
        ))}
      </div>

      <label
        className={cn(
          choiceCardClass,
          "flex items-center gap-3 px-4 py-3 text-left",
        )}
      >
        <input
          type="radio"
          value={CUSTOM_SURNAME_CHOICE}
          className="sr-only"
          {...radioA11yProps}
          {...choiceField}
        />
        <span aria-hidden="true" className={choiceIndicatorClass} />
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-dashed border-ink/25 text-ink/50 transition-colors group-has-checked:border-vermilion group-has-checked:text-vermilion"
        >
          +
        </span>
        <span className="text-sm font-semibold text-ink">Other surname</span>
        <span lang="ko" className="font-serif text-sm text-ink-muted">
          직접 입력
        </span>
      </label>

      {/*
        항상 마운트해 두고 hidden으로만 토글한다 — RHF의 필드 등록 순서가 화면 순서와 같아져
        제출 오류 시 첫 번째 오류 필드로 포커스가 정확히 이동한다.
      */}
      <div
        hidden={!isCustom}
        className="flex flex-col gap-2 rounded-2xl border border-dashed border-vermilion/40 bg-white/60 p-4"
      >
        <label
          htmlFor={CUSTOM_INPUT_ID}
          className="text-sm font-semibold text-ink"
        >
          Your surname
        </label>
        <FieldHint id={CUSTOM_INPUT_ID}>
          Hangul (1–2 syllables, e.g. <span lang="ko">서 · 남궁</span>) or
          English letters (e.g. Seo, Namgung).
        </FieldHint>
        <input
          id={CUSTOM_INPUT_ID}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. Seo"
          aria-invalid={customError ? true : undefined}
          aria-describedby={describedBy(CUSTOM_INPUT_ID, {
            hint: true,
            error: Boolean(customError),
          })}
          className={inputClass}
          {...register("surname.custom", { deps: ["nameLength"] })}
        />
        <FieldError
          id={CUSTOM_INPUT_ID}
          message={isCustom ? customError : undefined}
        />
      </div>
    </FieldGroup>
  );
}
