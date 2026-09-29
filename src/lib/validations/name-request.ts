import { z } from "zod";

import { getSurnameOption } from "@/lib/constants/surnames";
import { getTodayIsoDate } from "@/lib/date";
import { toCanonicalTimeZone } from "@/lib/time-zone";
import {
  GENDERS,
  NAME_LENGTHS,
  PRESET_SURNAME_IDS,
  type SurnameSelection,
} from "@/types/name";

import {
  countSelectedSurnameSyllables,
  englishNameSchema,
  getBirthDateError,
  isValidCustomSurname,
  TIME_PATTERN,
  toCustomSurname,
  VALIDATION_MESSAGES,
} from "./rules";

/*
 * 이름 생성 API(POST /api/generate-name) 요청 본문 스키마.
 * 입력 폼이 만든 NameRequest를 받지만 클라이언트를 믿지 않고 같은 규칙으로 다시 검증한다.
 * - 대표 성씨는 id만 믿고 한글·한자·표기는 서버 데이터로 다시 채운다.
 * - 알 수 없는 필드는 버린다 (z.object 기본 동작).
 */

const surnameSchema = z
  .discriminatedUnion(
    "source",
    [
      z.object({
        source: z.literal("preset"),
        id: z.enum(PRESET_SURNAME_IDS, VALIDATION_MESSAGES.surnameChoice),
      }),
      z.object({
        source: z.literal("custom"),
        value: z
          .string()
          .trim()
          .min(1, VALIDATION_MESSAGES.customSurnameRequired)
          .refine(
            isValidCustomSurname,
            VALIDATION_MESSAGES.customSurnamePattern,
          ),
      }),
    ],
    { error: "Send a preset surname id or a custom surname." },
  )
  .transform((surname): SurnameSelection =>
    surname.source === "preset"
      ? { source: "preset", ...getSurnameOption(surname.id) }
      : toCustomSurname(surname.value),
  );

const birthSchema = z
  .object({
    date: z.string(),
    time: z
      .string()
      .regex(TIME_PATTERN, VALIDATION_MESSAGES.birthTimePattern)
      .transform((time) => time.slice(0, 5))
      .nullable(),
    // 정식 IANA 이름으로 바꿔 쓴다 — "asia/seoul" 같은 변형 표기는 하나로 모으고, 지원 목록 밖의 값은 거부한다
    timeZone: z.string().transform((value, ctx) => {
      const canonical = toCanonicalTimeZone(value);
      if (!canonical) {
        ctx.addIssue({
          code: "custom",
          message:
            value === ""
              ? VALIDATION_MESSAGES.timeZoneRequired
              : VALIDATION_MESSAGES.timeZoneInvalid,
        });
        return z.NEVER;
      }
      return canonical;
    }),
  })
  .superRefine(({ date, timeZone }, ctx) => {
    // '미래 날짜' 판정은 서버 시간대가 아니라 출생지 시간대의 오늘을 기준으로 한다
    const message = getBirthDateError(date, getTodayIsoDate(timeZone));
    if (message) ctx.addIssue({ code: "custom", path: ["date"], message });
  });

export const nameRequestSchema = z
  .object({
    englishName: englishNameSchema,
    gender: z.enum(GENDERS, VALIDATION_MESSAGES.gender),
    surname: surnameSchema,
    birth: birthSchema,
    nameLength: z.literal(NAME_LENGTHS, VALIDATION_MESSAGES.nameLength),
  })
  .superRefine(
    ({ surname, nameLength }, ctx) => {
      if (nameLength - countSelectedSurnameSyllables(surname) < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["nameLength"],
          message: VALIDATION_MESSAGES.nameLengthCompound,
        });
      }
    },
    {
      when: ({ issues }) =>
        !issues.some(
          (issue) =>
            issue.path?.[0] === "surname" || issue.path?.[0] === "nameLength",
        ),
    },
  );

/** 검증을 통과한 요청 — 도메인 NameRequest와 같은 모양이어야 한다 (route.ts에서 대입으로 확인) */
export type ValidNameRequest = z.output<typeof nameRequestSchema>;
