"use client";

import { Controller, useWatch } from "react-hook-form";

import { fieldMessageIds, FieldGroup } from "@/components/ui/field";
import { choiceCardClass, choiceIndicatorClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import {
  GIVEN_NAME_STYLES,
  MOST_COMMON_GIVEN_SYLLABLES,
  type GivenNameSyllables,
} from "@/lib/constants/form-options";
import { countSurnameSyllables } from "@/lib/validations/name-form";
import { NAME_LENGTHS } from "@/types/name";

import { useNameFormContext } from "./use-name-form-context";

const GROUP_ID = "name-length";

export function NameLengthField() {
  const {
    control,
    trigger,
    formState: { errors },
  } = useNameFormContext();
  const surname = useWatch({ control, name: "surname" });
  const surnameSyllables = countSurnameSyllables(surname);
  const error = errors.nameLength?.message;

  const isAvailable = (length: number) => length > surnameSyllables;

  return (
    <FieldGroup
      id={GROUP_ID}
      label="Name length"
      hangul="이름 자수"
      hint="Total syllables including your surname — each Korean syllable is one character."
      error={error}
    >
      {/* 값이 숫자(2·3·4)라서 register 대신 Controller로 네이티브 라디오를 제어한다 */}
      <Controller
        control={control}
        name="nameLength"
        render={({ field }) => {
          // 오류 시 RHF가 포커스를 옮길 대상: 선택된 항목, 비활성화됐다면 첫 번째 가능한 항목
          const focusTarget = isAvailable(field.value)
            ? field.value
            : NAME_LENGTHS.find(isAvailable);

          return (
            <div className="grid gap-3 sm:grid-cols-3">
              {NAME_LENGTHS.map((length) => {
                const givenSyllables = length - surnameSyllables;
                const style = isGivenNameSyllables(givenSyllables)
                  ? GIVEN_NAME_STYLES[givenSyllables]
                  : null;
                const example =
                  surnameSyllables > 1
                    ? style?.examples.compound
                    : style?.examples.single;

                return (
                  <label
                    key={length}
                    className={cn(
                      choiceCardClass,
                      "flex flex-col gap-3 p-4 text-left",
                    )}
                  >
                    <input
                      ref={length === focusTarget ? field.ref : undefined}
                      type="radio"
                      name={field.name}
                      value={length}
                      checked={field.value === length}
                      disabled={!style}
                      onChange={() => {
                        field.onChange(length);
                        // 복성 충돌 오류가 떠 있다면 즉시 다시 검사해 해제한다
                        if (error) void trigger("nameLength");
                      }}
                      onBlur={field.onBlur}
                      className="sr-only"
                      aria-describedby={
                        error ? fieldMessageIds(GROUP_ID).errorId : undefined
                      }
                    />
                    <span aria-hidden="true" className={choiceIndicatorClass} />

                    <span className="flex items-baseline gap-2 pr-4">
                      <span className="font-serif text-2xl leading-none font-semibold text-ink">
                        {length}
                      </span>
                      <span className="text-sm text-ink-muted">characters</span>
                      {givenSyllables === MOST_COMMON_GIVEN_SYLLABLES ? (
                        <span className="ml-auto rounded-full bg-ochre/15 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-ochre-deep">
                          Most common
                        </span>
                      ) : null}
                    </span>

                    <SyllableCells
                      total={length}
                      surnameSyllables={surnameSyllables}
                    />

                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-ink">
                        {style ? style.title : "Not available"}
                      </span>
                      <span className="text-xs leading-relaxed text-ink-muted">
                        {style
                          ? describeSplit(surnameSyllables, givenSyllables)
                          : "Your surname already fills both syllables."}
                      </span>
                    </span>

                    {example ? (
                      <span className="mt-auto border-t border-ink/10 pt-2 text-xs text-ink-muted">
                        <span lang="ko" className="font-serif text-ink">
                          {example.hangul}
                        </span>{" "}
                        · {example.romanization}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          );
        }}
      />
    </FieldGroup>
  );
}

function isGivenNameSyllables(value: number): value is GivenNameSyllables {
  return value in GIVEN_NAME_STYLES;
}

function describeSplit(surnameSyllables: number, givenSyllables: number) {
  const surnameLabel =
    surnameSyllables > 1 ? `${surnameSyllables}-syllable surname` : "Surname";
  return `${surnameLabel} + ${givenSyllables}-syllable given name`;
}

interface SyllableCellsProps {
  total: number;
  surnameSyllables: number;
}

/** 원고지 칸 모티프: 성(姓) 칸은 인주색, 이름(名) 칸은 비워 둔다 */
function SyllableCells({ total, surnameSyllables }: SyllableCellsProps) {
  return (
    <span aria-hidden="true" lang="ko" className="flex gap-1">
      {Array.from({ length: total }, (_, index) => {
        const isSurname = index < surnameSyllables;

        return (
          <span
            key={index}
            className={cn(
              "grid size-8 place-items-center rounded-md border font-serif text-sm transition-colors",
              isSurname
                ? "border-vermilion bg-vermilion text-hanji"
                : "border-dashed border-ink/25 bg-white/60 text-ink/40 group-has-checked:border-solid group-has-checked:border-vermilion/50 group-has-checked:text-vermilion",
            )}
          >
            {isSurname ? "姓" : "名"}
          </span>
        );
      })}
    </span>
  );
}
