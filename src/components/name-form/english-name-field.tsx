"use client";

import { describedBy, Field } from "@/components/ui/field";
import { inputClass } from "@/components/ui/styles";

import { useNameFormContext } from "./use-name-form-context";

const INPUT_ID = "english-name";

export function EnglishNameField() {
  const {
    register,
    formState: { errors },
  } = useNameFormContext();
  const error = errors.englishName?.message;

  return (
    <Field
      id={INPUT_ID}
      label="Your current name"
      hangul="영문 이름"
      hint="Write it the way you do today — we’ll echo its sound in your Korean name."
      error={error}
    >
      <input
        id={INPUT_ID}
        type="text"
        autoComplete="name"
        autoCapitalize="words"
        spellCheck={false}
        placeholder="e.g. Emily Johnson"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(INPUT_ID, {
          hint: true,
          error: Boolean(error),
        })}
        className={inputClass}
        {...register("englishName")}
      />
    </Field>
  );
}
