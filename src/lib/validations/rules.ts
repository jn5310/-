import { z } from "zod";

import { getTodayIsoDate, isValidIsoDate } from "@/lib/date";
import { isValidTimeZone } from "@/lib/time-zone";
import {
  CUSTOM_SURNAME_CHOICE,
  type CustomSurname,
  type SurnameFieldValues,
  type SurnameSelection,
} from "@/types/name";

/*
 * 입력 폼(클라이언트)과 이름 생성 API(서버)가 함께 쓰는 검증 규칙.
 * 한곳에 모아 두어 브라우저와 서버의 판정이 어긋나지 않게 한다.
 */

/** 만세력 지원 범위의 하한 */
export const MIN_BIRTH_DATE = "1900-01-01";
export const ENGLISH_NAME_MAX_LENGTH = 50;
export const CUSTOM_SURNAME_MAX_LENGTH = 20;

/** 라틴 문자로 시작하고 라틴 문자·결합 부호·공백·’'.- 만 허용 (José, Zoë, O’Brien, Mary-Jane) */
const ENGLISH_NAME_PATTERN = /^\p{Script=Latin}[\p{Script=Latin}\p{M} '’.-]*$/u;
/** 한글 성씨 1–2음절 — 복성(남궁·황보·제갈·선우·독고 등) 포함 */
const HANGUL_SURNAME_PATTERN = /^[가-힣]{1,2}$/;
/** 영문 성씨 (Seo, Namgung, Sun-woo) */
const LATIN_SURNAME_PATTERN = /^[A-Za-z]+(?:[-' ][A-Za-z]+)?$/;
/** HH:mm — 브라우저가 초를 붙여도 허용 */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

/**
 * 영문으로 적은 복성(複姓) — 소문자·구분자 제거 기준.
 * 남궁·황보·제갈·선우·독고·사공·서문·동방의 주요 관용 표기를 2음절로 인식한다.
 */
const ROMANIZED_COMPOUND_SURNAMES = new Set([
  ...["namgung", "namkoong", "namkung", "namgoong"], // 남궁
  ...["hwangbo", "whangbo"], // 황보
  ...["jegal", "chegal"], // 제갈
  ...["seonu", "seonwoo", "sunwoo", "sunu"], // 선우
  ...["dokgo", "dokko", "tokko"], // 독고
  ...["sagong", "sakong"], // 사공
  ...["seomun", "seomoon"], // 서문
  "dongbang", // 동방
]);

export const VALIDATION_MESSAGES = {
  englishNameRequired: "Please enter your name.",
  englishNameTooLong: `Please keep it within ${ENGLISH_NAME_MAX_LENGTH} characters.`,
  englishNamePattern:
    "Use English letters — spaces, hyphens and apostrophes are fine.",
  gender: "Choose the style of name you’d like.",
  surnameChoice: "Pick a surname, or choose “Other” to type your own.",
  customSurnameRequired: "Type the surname you’d like to use.",
  customSurnamePattern:
    "Use 1–2 Hangul syllables (e.g. 서) or English letters (e.g. Seo).",
  birthTimeRequired: "Enter your birth time, or tick “I don’t know”.",
  birthTimePattern: "Enter a valid time (HH:MM).",
  timeZoneRequired: "Choose the time zone where you were born.",
  timeZoneInvalid: "Choose a valid time zone.",
  nameLength: "Choose 2, 3 or 4 characters.",
  nameLengthCompound:
    "A two-syllable surname needs 3 or 4 characters in total, leaving room for a given name.",
} as const;

/** 영문 이름 — 앞뒤·중복 공백을 정리한 뒤 검사한다 */
export const englishNameSchema = z
  .string()
  .trim()
  .overwrite((value) => value.replace(/\s+/g, " "))
  .min(1, VALIDATION_MESSAGES.englishNameRequired)
  .max(ENGLISH_NAME_MAX_LENGTH, VALIDATION_MESSAGES.englishNameTooLong)
  .regex(ENGLISH_NAME_PATTERN, VALIDATION_MESSAGES.englishNamePattern);

export function isValidCustomSurname(value: string): boolean {
  return (
    value.length <= CUSTOM_SURNAME_MAX_LENGTH &&
    (HANGUL_SURNAME_PATTERN.test(value) || LATIN_SURNAME_PATTERN.test(value))
  );
}

/**
 * 직접 입력한 성씨의 음절 수.
 * 한글이면 글자 수, 영문이면 알려진 복성 표기만 2음절로 보고 나머지는 1음절로 간주한다.
 */
export function countCustomSurnameSyllables(value: string): number {
  const trimmed = value.trim();
  if (HANGUL_SURNAME_PATTERN.test(trimmed)) return trimmed.length;
  const normalized = trimmed.toLowerCase().replace(/[-' ]/g, "");
  return ROMANIZED_COMPOUND_SURNAMES.has(normalized) ? 2 : 1;
}

/** 폼 입력값 기준 성씨 음절 수 — 대표 성씨는 모두 1음절 */
export function countSurnameSyllables(
  surname: Partial<SurnameFieldValues> | undefined,
): number {
  if (surname?.choice !== CUSTOM_SURNAME_CHOICE) return 1;
  return countCustomSurnameSyllables(surname.custom ?? "");
}

/** 정리된 추천 요청 기준 성씨 음절 수 */
export function countSelectedSurnameSyllables(
  surname: SurnameSelection,
): number {
  return surname.source === "preset"
    ? 1
    : countCustomSurnameSyllables(surname.value);
}

/**
 * 직접 입력한 성씨를 정리한다.
 * 영문은 띄어 쓴 단어마다 첫 글자만 대문자로 맞춘다 (namGUNG → Namgung, de luca → De Luca, sun-woo → Sun-woo).
 */
export function toCustomSurname(value: string): CustomSurname {
  const trimmed = value.trim().replace(/\s+/g, " ");
  const isHangul = HANGUL_SURNAME_PATTERN.test(trimmed);
  return {
    source: "custom",
    value: isHangul
      ? trimmed
      : trimmed
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" "),
    script: isHangul ? "hangul" : "latin",
  };
}

/**
 * @param today 미래 날짜 판정 기준일(YYYY-MM-DD). 서버는 출생지 시간대의 오늘을 넘긴다.
 */
export function getBirthDateError(
  value: string,
  today: string = getTodayIsoDate(),
): string | null {
  if (value === "") return "Please enter your date of birth.";
  if (!isValidIsoDate(value)) return "Please enter a valid date.";
  if (value < MIN_BIRTH_DATE) return "Please enter a date from 1900 onward.";
  if (value > today) return "Your birth date can’t be in the future.";
  return null;
}

export function getTimeZoneError(value: string): string | null {
  if (value === "") return VALIDATION_MESSAGES.timeZoneRequired;
  if (!isValidTimeZone(value)) return VALIDATION_MESSAGES.timeZoneInvalid;
  return null;
}
