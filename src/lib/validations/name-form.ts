import { z } from "zod";

import { getSurnameOption } from "@/lib/constants/surnames";
import { getTodayIsoDate, isValidIsoDate } from "@/lib/date";
import { isValidTimeZone } from "@/lib/time-zone";
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

// ─── 규칙 ───────────────────────────────────────────────────

/** 만세력 지원 범위의 하한 */
export const MIN_BIRTH_DATE = "1900-01-01";
const ENGLISH_NAME_MAX_LENGTH = 50;
const CUSTOM_SURNAME_MAX_LENGTH = 20;

/** 라틴 문자로 시작하고 라틴 문자·결합 부호·공백·’'.- 만 허용 (José, Zoë, O’Brien, Mary-Jane) */
const ENGLISH_NAME_PATTERN = /^\p{Script=Latin}[\p{Script=Latin}\p{M} '’.-]*$/u;
/** 한글 성씨 1–2음절 — 복성(남궁·황보·제갈·선우·독고 등) 포함 */
const HANGUL_SURNAME_PATTERN = /^[가-힣]{1,2}$/;
/** 영문 성씨 (Seo, Namgung, Sun-woo) */
const LATIN_SURNAME_PATTERN = /^[A-Za-z]+(?:[-' ][A-Za-z]+)?$/;
/**
 * 영문으로 적은 복성(複姓) — 소문자·구분자 제거 기준.
 * 남궁·황보·제갈·선우·독고·사공·서문·동방의 주요 관용 표기를 2음절로 인식한다.
 */
const ROMANIZED_COMPOUND_SURNAMES = new Set([
  "namgung",
  "namkoong",
  "namkung",
  "namgoong", // 남궁
  "hwangbo",
  "whangbo", // 황보
  "jegal",
  "chegal", // 제갈
  "seonu",
  "seonwoo",
  "sunwoo",
  "sunu", // 선우
  "dokgo",
  "dokko",
  "tokko", // 독고
  "sagong",
  "sakong", // 사공
  "seomun",
  "seomoon", // 서문
  "dongbang", // 동방
]);
/** HH:mm — 브라우저가 초를 붙여도 허용 */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const SURNAME_CHOICES = [...PRESET_SURNAME_IDS, CUSTOM_SURNAME_CHOICE] as const;

// ─── UI와 공유하는 도메인 헬퍼 ───────────────────────────────

/**
 * 성씨 음절 수. 대표 성씨는 모두 1음절이다.
 * 직접 입력은 한글이면 글자 수, 영문이면 알려진 복성 표기만 2음절로 보고 나머지는 1음절로 간주한다.
 */
export function countSurnameSyllables(
  surname: Partial<SurnameFieldValues> | undefined,
): number {
  if (surname?.choice !== CUSTOM_SURNAME_CHOICE) return 1;
  const custom = surname.custom?.trim() ?? "";
  if (HANGUL_SURNAME_PATTERN.test(custom)) return custom.length;

  const normalized = custom.toLowerCase().replace(/[-' ]/g, "");
  return ROMANIZED_COMPOUND_SURNAMES.has(normalized) ? 2 : 1;
}

function getBirthDateError(value: string): string | null {
  if (value === "") return "Please enter your date of birth.";
  if (!isValidIsoDate(value)) return "Please enter a valid date.";
  if (value < MIN_BIRTH_DATE) return "Please enter a date from 1900 onward.";
  if (value > getTodayIsoDate())
    return "Your birth date can’t be in the future.";
  return null;
}

// ─── 필드 스키마 ─────────────────────────────────────────────

const englishNameSchema = z
  .string()
  .trim()
  .overwrite((value) => value.replace(/\s+/g, " "))
  .min(1, "Please enter your name.")
  .max(
    ENGLISH_NAME_MAX_LENGTH,
    `Please keep it within ${ENGLISH_NAME_MAX_LENGTH} characters.`,
  )
  .regex(
    ENGLISH_NAME_PATTERN,
    "Use English letters — spaces, hyphens and apostrophes are fine.",
  );

/*
 * 조건부 검증은 하위 객체의 superRefine에서 처리한다.
 * Zod 4는 이미 '중단(abort)' 이슈가 있는 객체의 refinement를 건너뛰는데,
 * 하위 객체로 분리하면 다른 필드(예: 성별 미선택)의 오류와 무관하게 동시에 검사된다.
 */
const surnameSchema = z
  .object({
    choice: z.enum(
      SURNAME_CHOICES,
      "Pick a surname, or choose “Other” to type your own.",
    ),
    custom: z.string().trim(),
  })
  .superRefine(({ choice, custom }, ctx) => {
    if (choice !== CUSTOM_SURNAME_CHOICE) return;

    if (custom === "") {
      ctx.addIssue({
        code: "custom",
        path: ["custom"],
        message: "Type the surname you’d like to use.",
      });
    } else if (
      custom.length > CUSTOM_SURNAME_MAX_LENGTH ||
      !(
        HANGUL_SURNAME_PATTERN.test(custom) ||
        LATIN_SURNAME_PATTERN.test(custom)
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["custom"],
        message:
          "Use 1–2 Hangul syllables (e.g. 서) or English letters (e.g. Seo).",
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
      if (value === "") {
        ctx.addIssue({
          code: "custom",
          message: "Choose the time zone where you were born.",
        });
      } else if (!isValidTimeZone(value)) {
        ctx.addIssue({ code: "custom", message: "Choose a valid time zone." });
      }
    }),
  })
  .superRefine(({ time, timeUnknown }, ctx) => {
    if (timeUnknown) return;

    if (time === "") {
      ctx.addIssue({
        code: "custom",
        path: ["time"],
        message: "Enter your birth time, or tick “I don’t know”.",
      });
    } else if (!TIME_PATTERN.test(time)) {
      ctx.addIssue({
        code: "custom",
        path: ["time"],
        message: "Enter a valid time (HH:MM).",
      });
    }
  });

// ─── 폼 스키마 ──────────────────────────────────────────────

const nameFormObjectSchema = z
  .object({
    englishName: englishNameSchema,
    gender: z.enum(GENDERS, "Choose the style of name you’d like."),
    surname: surnameSchema,
    birth: birthSchema,
    nameLength: z.literal(NAME_LENGTHS, "Choose 2, 3 or 4 characters."),
  })
  .superRefine(
    ({ surname, nameLength }, ctx) => {
      // 복성(2음절 성)이면 성만으로 2자를 채우므로 이름 자리가 남지 않는다
      if (nameLength - countSurnameSyllables(surname) < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["nameLength"],
          message:
            "A two-syllable surname needs 3 or 4 characters in total, leaving room for a given name.",
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

  const isHangul = HANGUL_SURNAME_PATTERN.test(custom);
  return {
    source: "custom",
    value: isHangul
      ? custom
      : custom.charAt(0).toUpperCase() + custom.slice(1).toLowerCase(),
    script: isHangul ? "hangul" : "latin",
  };
}

/**
 * 입력 폼 스키마.
 * - 입력(z.input): NameFormValues — React Hook Form이 관리하는 원시 입력값
 * - 출력(z.output): NameRequest — 검증·정규화가 끝난 추천 요청 (handleSubmit이 받는 값)
 * 서버(Route Handler / Server Action)에서도 같은 스키마로 재검증할 수 있다.
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
