import type { ElementBalance, FiveElement, SajuChart } from "./saju";

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

// ─── 추천 결과 (추천 엔진 → UI) — 다음 단계 API 계약 ─────────────

/** 이름에 쓰인 한자 한 글자의 성명학 정보 */
export interface HanjaCharacter {
  /** 한자 (예: 瑞) */
  hanja: string;
  /** 음 (예: 서) */
  reading: string;
  /** 훈(뜻)의 영문 풀이 (예: auspicious) */
  meaning: string;
  /** 원획법(原劃法) 획수 — 수리(數理) 사격(四格) 계산 기준 */
  strokes: number;
  /** 자원오행(字源五行) */
  element: FiveElement;
}

export interface NameRecommendation {
  id: string;
  /** 전체 이름 한글 (예: 김서윤) */
  hangul: string;
  /** 영문 표기 (예: Kim Seo-yun) */
  romanization: string;
  /** 성을 제외한 이름 글자별 한자 */
  givenNameHanja: HanjaCharacter[];
  /** 발음오행 — 각 음절 초성 기준 */
  soundElements: FiveElement[];
  /** 이름 풀이 (영문) */
  meaning: string;
  /** 사주 보완·음운·수리를 종합한 적합도 (0–100) */
  score: number;
}

export interface NameRecommendationResult {
  request: NameRequest;
  saju: SajuChart;
  elementBalance: ElementBalance;
  /** 이름으로 보완할 오행 (용신·희신) */
  favorableElements: FiveElement[];
  recommendations: NameRecommendation[];
}
