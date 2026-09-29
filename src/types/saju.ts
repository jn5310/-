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
