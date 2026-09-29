import { z } from "zod";

import { getSurnameOption } from "@/lib/constants/surnames";
import {
  CUSTOM_SURNAME_CHOICE,
  GENDERS,
  NAME_LENGTHS,
  PRESET_SURNAME_IDS,
  type NameFormValues,
  type NameRequest,
  type SurnameFieldValues,
  type SurnameSelection,
} from "@/types/name";

import {
  countSurnameSyllables,
  englishNameSchema,
  getBirthDateError,
  getTimeZoneError,
  isValidCustomSurname,
  TIME_PATTERN,
  toCustomSurname,
  VALIDATION_MESSAGES,
} from "./rules";

export { countSurnameSyllables, MIN_BIRTH_DATE } from "./rules";

const SURNAME_CHOICES = [...PRESET_SURNAME_IDS, CUSTOM_SURNAME_CHOICE] as const;

/*
 * 조건부 검증은 하위 객체의 superRefine에서 처리한다.
 * Zod 4는 이미 '중단(abort)' 이슈가 있는 객체의 refinement를 건너뛰는데,
 * 하위 객체로 분리하면 다른 필드(예: 성별 미선택)의 오류와 무관하게 동시에 검사된다.
 */
const surnameSchema = z
  .object({
    choice: z.enum(SURNAME_CHOICES, VALIDATION_MESSAGES.surnameChoice),
    custom: z.string().trim(),
  })
  .superRefine(({ choice, custom }, ctx) => {
    if (choice !== CUSTOM_SURNAME_CHOICE) return;

    if (custom === "") {
      ctx.addIssue({
        code: "custom",
        path: ["custom"],
        message: VALIDATION_MESSAGES.customSurnameRequired,
      });
    } else if (!isValidCustomSurname(custom)) {
      ctx.addIssue({
        code: "custom",
        path: ["custom"],
        message: VALIDATION_MESSAGES.customSurnamePattern,
      });
    }
  });

const birthSchema = z
  .object({
    date: z.string().superRefine((value, ctx) => {
      const message = getBirthDateError(value);
      if (message) ctx.addIssue({ code: "custom", message });
    }),
    time: z.string(),
    timeUnknown: z.boolean(),
    timeZone: z.string().superRefine((value, ctx) => {
      const message = getTimeZoneError(value);
      if (message) ctx.addIssue({ code: "custom", message });
    }),
  })
  .superRefine(({ time, timeUnknown }, ctx) => {
    if (timeUnknown) return;

    if (time === "") {
      ctx.addIssue({
        code: "custom",
        path: ["time"],
        message: VALIDATION_MESSAGES.birthTimeRequired,
      });
    } else if (!TIME_PATTERN.test(time)) {
      ctx.addIssue({
        code: "custom",
        path: ["time"],
        message: VALIDATION_MESSAGES.birthTimePattern,
      });
    }
  });

const nameFormObjectSchema = z
  .object({
    englishName: englishNameSchema,
    gender: z.enum(GENDERS, VALIDATION_MESSAGES.gender),
    surname: surnameSchema,
    birth: birthSchema,
    nameLength: z.literal(NAME_LENGTHS, VALIDATION_MESSAGES.nameLength),
  })
  .superRefine(
    ({ surname, nameLength }, ctx) => {
      // 복성(2음절 성)이면 성만으로 2자를 채우므로 이름 자리가 남지 않는다
      if (nameLength - countSurnameSyllables(surname) < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["nameLength"],
          message: VALIDATION_MESSAGES.nameLengthCompound,
        });
      }
    },
    {
      // 다른 필드에 오류가 있어도 성씨·자수가 유효하면 조합 검사를 실행한다
      when: ({ issues }) =>
        !issues.some(
          (issue) =>
            issue.path?.[0] === "surname" || issue.path?.[0] === "nameLength",
        ),
    },
  );

function toSurnameSelection({
  choice,
  custom,
}: SurnameFieldValues): SurnameSelection {
  if (choice !== CUSTOM_SURNAME_CHOICE) {
    return { source: "preset", ...getSurnameOption(choice) };
  }
  return toCustomSurname(custom);
}

/**
 * 입력 폼 스키마.
 * - 입력(z.input): NameFormValues — React Hook Form이 관리하는 원시 입력값
 * - 출력(z.output): NameRequest — 검증·정규화가 끝난 추천 요청 (handleSubmit이 받는 값)
 * 서버는 같은 규칙으로 만든 nameRequestSchema(name-request.ts)로 다시 검증한다.
 */
export const nameFormSchema = nameFormObjectSchema.transform(
  (values): NameRequest => ({
    englishName: values.englishName,
    gender: values.gender,
    surname: toSurnameSelection(values.surname),
    birth: {
      date: values.birth.date,
      time: values.birth.timeUnknown ? null : values.birth.time.slice(0, 5),
      timeZone: values.birth.timeZone,
    },
    nameLength: values.nameLength,
  }),
) satisfies z.ZodType<NameRequest, NameFormValues>;
