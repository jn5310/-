/**
 * 사주명리(四柱命理) 기본 어휘.
 * 추천 엔진(만세력 계산·오행 분석)과 UI가 같은 용어를 쓰도록 공용 타입으로 둔다.
 */

/** 오행(五行): 木·火·土·金·水 */
export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

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

/** 간지(干支) 한 기둥. 예) 갑자(甲子) = { stem: "gap", branch: "ja" } */
export interface SajuPillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
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

/** 원국(原局)의 오행 분포 — 여덟 글자 기준 개수 또는 가중치 */
export type ElementBalance = Record<FiveElement, number>;
