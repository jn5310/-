/*
 * K-Name Studio 도메인 모델
 *
 * 선택지는 `as const` 튜플을 단일 진실 공급원(SSOT)으로 두고 타입을 파생한다.
 * Zod 스키마(z.enum / z.literal)와 UI 옵션 목록이 같은 값을 공유하므로 서로 어긋날 수 없다.
 */

// ─── 선택지 ─────────────────────────────────────────────────

export const GENDERS = ["male", "female", "neutral"] as const;
export type Gender = (typeof GENDERS)[number];

/** 성(姓)을 포함한 이름 전체 글자(음절) 수 */
export const NAME_LENGTHS = [2, 3, 4] as const;
export type NameLength = (typeof NAME_LENGTHS)[number];
export const DEFAULT_NAME_LENGTH: NameLength = 3;

/** 대표 성씨 12선 — 통계청 2015 인구주택총조사 인구 순 */
export const PRESET_SURNAME_IDS = [
  "kim",
  "lee",
  "park",
  "choi",
  "jung",
  "kang",
  "cho",
  "yoon",
  "jang",
  "lim",
  "han",
  "oh",
] as const;
export type PresetSurnameId = (typeof PRESET_SURNAME_IDS)[number];

/** 성씨 선택지 중 '직접 입력'을 뜻하는 값 */
export const CUSTOM_SURNAME_CHOICE = "custom";
export type SurnameChoice = PresetSurnameId | typeof CUSTOM_SURNAME_CHOICE;

export interface SurnameOption {
  id: PresetSurnameId;
  /** 한글 표기 (예: 김) */
  hangul: string;
  /** 대표 한자 (예: 金) — 동음이자 성씨는 인구가 가장 많은 한자를 기본값으로 둔다 */
  hanja: string;
  /** 여권·K-pop에서 통용되는 영문 표기 (예: Kim, Lee) */
  romanization: string;
}

// ─── 입력 폼 상태 (React Hook Form이 다루는 원시 입력값) ──────────

export interface SurnameFieldValues {
  choice: SurnameChoice;
  /** choice가 "custom"일 때만 사용 — 한글 1–2음절 또는 영문 */
  custom: string;
}

export interface BirthFieldValues {
  /** YYYY-MM-DD (양력) — <input type="date"> 값 */
  date: string;
  /** HH:mm, 24시간제 — <input type="time"> 값 */
  time: string;
  /** 출생 시각을 모르면 true → 시주(時柱) 없이 분석 */
  timeUnknown: boolean;
  /** IANA 시간대 (예: "America/New_York") */
  timeZone: string;
}

/** 생년월일시만 받는 폼(사주 분석)과 이름 짓기 폼이 공유하는 부분 — BirthFields가 이 모양을 쓴다 */
export interface BirthFormValues {
  birth: BirthFieldValues;
}

export interface NameFormValues {
  englishName: string;
  gender: Gender;
  surname: SurnameFieldValues;
  birth: BirthFieldValues;
  nameLength: NameLength;
}

// ─── 추천 요청 (폼 → 추천 엔진) ───────────────────────────────

export interface PresetSurname extends SurnameOption {
  source: "preset";
}

export interface CustomSurname {
  source: "custom";
  /** 사용자가 입력한 성씨 (한글 또는 영문) */
  value: string;
  script: "hangul" | "latin";
}

export type SurnameSelection = PresetSurname | CustomSurname;

export interface BirthInfo {
  /** 양력(그레고리력) 생년월일, YYYY-MM-DD */
  date: string;
  /** 출생 시각 HH:mm — null이면 시각 미상으로 삼주(三柱) 분석 */
  time: string | null;
  /** 출생지 IANA 시간대 — 서머타임·진태양시(眞太陽時) 보정의 기준 */
  timeZone: string;
}

export interface NameRequest {
  englishName: string;
  gender: Gender;
  surname: SurnameSelection;
  birth: BirthInfo;
  nameLength: NameLength;
}

// 추천 결과(API 응답) 계약은 ./api.ts — POST /api/generate-name
