"use client";

import { fieldMessageIds, FieldGroup } from "@/components/ui/field";
import { choiceCardClass, choiceIndicatorClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { GENDER_OPTIONS } from "@/lib/constants/form-options";
import { GENDERS } from "@/types/name";

import { useNameFormContext } from "./use-name-form-context";

const GROUP_ID = "gender";

export function GenderField() {
  const {
    register,
    formState: { errors },
  } = useNameFormContext();
  const error = errors.gender?.message;

  return (
    <FieldGroup
      id={GROUP_ID}
      label="Gender"
      hangul="성별"
      hint="Sets the tone of the sounds and characters we choose."
      error={error}
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {GENDERS.map((gender) => {
          const option = GENDER_OPTIONS[gender];

          return (
            <label
              key={gender}
              className={cn(
                choiceCardClass,
                "flex flex-col items-center justify-center gap-1 px-2 py-4 text-center",
              )}
            >
              <input
                type="radio"
                value={gender}
                className="sr-only"
                aria-invalid={error ? true : undefined}
                aria-describedby={
                  error ? fieldMessageIds(GROUP_ID).errorId : undefined
                }
                {...register("gender")}
              />
              <span aria-hidden="true" className={choiceIndicatorClass} />
              <span
                lang="ko"
                className="font-serif text-lg font-semibold text-ink"
              >
                {option.hangul}
              </span>
              <span className="text-sm font-semibold text-ink">
                {option.label}
              </span>
              <span className="hidden text-xs leading-snug text-ink-muted sm:block">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
    </FieldGroup>
  );
}
