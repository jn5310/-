/**
 * 사주명리(四柱命理) 기본 어휘.
 * 만세력 계산(서버)·이름 생성 API·UI가 같은 용어를 쓰도록 공용 타입으로 둔다.
 */

/** 오행(五行): 木·火·土·金·水 */
export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

/** 음양(陰陽) */
export type YinYang = "yang" | "yin";

/** 천간(天干) 10자: 甲 乙 丙 丁 戊 己 庚 辛 壬 癸 */
export type HeavenlyStem =
  | "gap"
  | "eul"
  | "byeong"
  | "jeong"
  | "mu"
  | "gi"
  | "gyeong"
  | "sin"
  | "im"
  | "gye";

/** 지지(地支) 12자: 子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥 */
export type EarthlyBranch =
  | "ja"
  | "chuk"
  | "in"
  | "myo"
  | "jin"
  | "sa"
  | "o"
  | "mi"
  | "sin"
  | "yu"
  | "sul"
  | "hae";

/** 간지(干支) 한 기둥. 예) 갑자 = { stem: "gap", branch: "ja", hanja: "甲子", hangul: "갑자" } */
export interface SajuPillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  hanja: string;
  hangul: string;
}

/**
 * 사주팔자(四柱八字): 연·월·일·시 네 기둥.
 * 출생 시각을 모르면 시주(時柱)를 비우고 삼주(三柱)로 해석한다.
 */
export interface SajuChart {
  year: SajuPillar;
  month: SajuPillar;
  day: SajuPillar;
  hour: SajuPillar | null;
}

/** 원국(原局)의 오행 분포 — 천간·지지 표면 글자 수 */
export type ElementBalance = Record<FiveElement, number>;

/**
 * 계산 과정에서 짚어 둘 점
 * - hour-unknown: 출생 시각 미상 → 삼주 분석
 * - late-zi-hour: 23시 이후 출생 → 다음 날 일주로 계산 (자시 일진 교체)
 * - dst-removed: 서머타임을 빼고 표준시로 계산
 * - near-solar-term: 출생 순간이 절입(節入) 시각과 2시간 이내 → 월주가 민감
 * - solar-term-day: 시각 미상인데 출생일이 절입일 → 월주(와 연주)가 달라질 수 있음
 * - ambiguous-time: 서머타임 전환으로 그 시각이 두 번 있거나 없음 → 시각이 1시간 어긋날 수 있음
 */
export type SajuNote =
  | "hour-unknown"
  | "late-zi-hour"
  | "dst-removed"
  | "near-solar-term"
  | "solar-term-day"
  | "ambiguous-time";

export interface SajuReading {
  chart: SajuChart;
  /** 일간(日干) — 사주의 주인공 */
  dayMaster: {
    stem: HeavenlyStem;
    hanja: string;
    element: FiveElement;
    yinYang: YinYang;
  };
  elementBalance: ElementBalance;
  yinYang: Record<YinYang, number>;
  /** 계산에 쓴 출생지 표준시 (서머타임 제외). 시각 미상이면 time은 null */
  standardTime: { date: string; time: string | null; utcOffset: string };
  notes: SajuNote[];
}

// ─── 사주 분석(사주 전용 메뉴) ─────────────────────────────────

/** 원국 안에서 한 오행의 세기: 없음 · 약함 · 알맞음 · 강함 · 과다 */
export type ElementLevel =
  "missing" | "low" | "balanced" | "strong" | "dominant";

export interface ElementInsight {
  element: FiveElement;
  /** 원국 글자 수 — 시주를 모르면 6자 중, 알면 8자 중 */
  count: number;
  /** 전체 글자에서 차지하는 비율 (0–1) */
  share: number;
  level: ElementLevel;
  /** 이 오행이 뜻하는 기질 (예: "growth, vision and kindness") */
  qualities: string;
  /** 오상(五常) 덕목 (예: "Benevolence 仁") */
  virtue: string;
  /** 세기에 따른 한 줄 풀이 */
  summary: string;
}

/** 일간(日干) 풀이 — 사주의 주인공이 어떤 사람인지 */
export interface DayMasterProfile {
  stem: HeavenlyStem;
  hanja: string;
  hangul: string;
  element: FiveElement;
  yinYang: YinYang;
  /** 자연물 비유 (예: "The Sun") */
  image: string;
  /** 비유의 한국어 (예: "태양") */
  imageKo: string;
  summary: string;
  strengths: string[];
  challenges: string[];
}

/** 일간의 세기(신강·중화·신약) — 간단한 가중치 추정 */
export type DayMasterStrength = "strong" | "balanced" | "weak";

/** 오행을 생활에서 채우는 방법 (오방색·방위·계절) */
export interface ElementTip {
  element: FiveElement;
  colors: string;
  direction: string;
  season: string;
  activities: string;
}

export interface SajuAnalysis {
  dayMaster: DayMasterProfile;
  strength: {
    level: DayMasterStrength;
    /** 일간을 돕는 글자(같은 오행 · 생해 주는 오행)의 점수 — 월지(月支)는 2점 */
    support: number;
    total: number;
    summary: string;
  };
  /** 木·火·土·金·水 순서 */
  elements: ElementInsight[];
  /** 가장 많은 오행 (고르게 퍼져 있으면 빈 배열) */
  dominant: FiveElement[];
  /** 없거나 약한 오행 */
  lacking: FiveElement[];
  yinYang: {
    yang: number;
    yin: number;
    tendency: "yang" | "yin" | "balanced";
    summary: string;
  };
  /** 채우면 좋은 오행 — 일간 세기(억부)를 기준으로, 원국에 부족한 것을 먼저 */
  balancing: { elements: FiveElement[]; summary: string; tips: ElementTip[] };
  /** 사주 총평 */
  overview: string;
}

/** 사주 분석 결과 — 만세력 원국 + 풀이 */
export interface SajuResult {
  reading: SajuReading;
  analysis: SajuAnalysis;
}
