import type { EarthlyBranch, FiveElement } from "@/types/saju";

export interface BirthHourBranch {
  branch: EarthlyBranch;
  /** 예: 오시 */
  hangul: string;
  /** 예: 午時 */
  hanja: string;
  /** 12지 동물 (영문) */
  animal: string;
  /** 지지의 오행 */
  element: FiveElement;
  /** 해당 시진의 시계 시각 범위 (예: "11:00–12:59") */
  range: string;
}

/**
 * 12지시(十二支時) — 하루를 2시간씩 12구간으로 나눈 전통 시각. 자시(子時)는 전날 23:00에 시작한다.
 *
 * 주의: UI 안내용 근사치(시계 시각 기준)다. 실제 사주 분석에서는 출생지 경도에 따른
 * 진태양시(眞太陽時) 보정과 서머타임을 반영해야 한다.
 * 예) 한국 표준시는 동경 135° 기준이라 서울 출생자는 약 30분 늦춰 자시를 23:30–01:29로 본다.
 */
const BRANCHES: readonly Omit<BirthHourBranch, "range">[] = [
  {
    branch: "ja",
    hangul: "자시",
    hanja: "子時",
    animal: "Rat",
    element: "water",
  },
  {
    branch: "chuk",
    hangul: "축시",
    hanja: "丑時",
    animal: "Ox",
    element: "earth",
  },
  {
    branch: "in",
    hangul: "인시",
    hanja: "寅時",
    animal: "Tiger",
    element: "wood",
  },
  {
    branch: "myo",
    hangul: "묘시",
    hanja: "卯時",
    animal: "Rabbit",
    element: "wood",
  },
  {
    branch: "jin",
    hangul: "진시",
    hanja: "辰時",
    animal: "Dragon",
    element: "earth",
  },
  {
    branch: "sa",
    hangul: "사시",
    hanja: "巳時",
    animal: "Snake",
    element: "fire",
  },
  {
    branch: "o",
    hangul: "오시",
    hanja: "午時",
    animal: "Horse",
    element: "fire",
  },
  {
    branch: "mi",
    hangul: "미시",
    hanja: "未時",
    animal: "Goat",
    element: "earth",
  },
  {
    branch: "sin",
    hangul: "신시",
    hanja: "申時",
    animal: "Monkey",
    element: "metal",
  },
  {
    branch: "yu",
    hangul: "유시",
    hanja: "酉時",
    animal: "Rooster",
    element: "metal",
  },
  {
    branch: "sul",
    hangul: "술시",
    hanja: "戌時",
    animal: "Dog",
    element: "earth",
  },
  {
    branch: "hae",
    hangul: "해시",
    hanja: "亥時",
    animal: "Pig",
    element: "water",
  },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

const pad = (value: number) => String(value).padStart(2, "0");

/** "HH:mm" → 해당 시진. 형식이 올바르지 않으면 null */
export function getBirthHourBranch(time: string): BirthHourBranch | null {
  const match = TIME_PATTERN.exec(time);
  if (!match) return null;

  const minutes = Number(match[1]) * 60 + Number(match[2]);
  // 23:00을 0으로 맞추기 위해 60분을 더한 뒤 120분 단위로 나눈다
  const index = Math.floor((minutes + 60) / 120) % 12;
  const startHour = (index * 2 + 23) % 24;
  const endHour = (startHour + 1) % 24;

  return {
    ...BRANCHES[index],
    range: `${pad(startHour)}:00–${pad(endHour)}:59`,
  };
}
