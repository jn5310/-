import type { EarthlyBranch, FiveElement } from "@/types/saju";

import { EARTHLY_BRANCHES } from "./ganji";

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

/*
 * 12지시(十二支時) — 하루를 2시간씩 12구간으로 나눈 전통 시각. 자시(子時)는 전날 23:00에 시작한다.
 *
 * 주의: UI 안내용 근사치(시계 시각 기준)다. 실제 사주 계산(four-pillars.ts)은 서머타임을 빼고
 * 표준시로 본다. 경도에 따른 진태양시 보정(예: 서울 출생은 약 30분 늦춰 자시를 23:30–01:29로 봄)은
 * 출생 도시를 받게 되면 추가한다.
 */

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
  const branch = EARTHLY_BRANCHES[index];

  return {
    branch: branch.id,
    hangul: `${branch.hangul}시`,
    hanja: `${branch.hanja}時`,
    animal: branch.animal,
    element: branch.element,
    range: `${pad(startHour)}:00–${pad(endHour)}:59`,
  };
}
