import { parseIsoDate } from "@/lib/date";
import {
  formatUtcOffset,
  getDstShiftMinutes,
  getUtcOffsetMinutes,
  resolveWallTime,
  zonedTimeToInstant,
} from "@/lib/time-zone";
import type { BirthInfo } from "@/types/name";
import type {
  ElementBalance,
  SajuChart,
  SajuNote,
  SajuReading,
  YinYang,
} from "@/types/saju";

import {
  branchIndexOf,
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  makePillar,
  mod,
  pillarFromCycleIndex,
  stemIndexOf,
} from "./ganji";

/*
 * 만세력(萬歲曆) — 생년월일시로 사주팔자를 결정적으로 계산한다.
 * LLM은 간지 계산을 자주 틀리므로, 원국은 코드로 정하고 해석만 모델에 맡긴다.
 *
 * 계산 기준
 * - 연주: 입춘(태양 황경 315°)에 해가 바뀐다.
 * - 월주: 12절(節) — 황경 315°부터 30°마다 달이 바뀐다 (寅月 … 丑月).
 *         월간은 연간에서 정한다(年上起月法: 甲己년 → 丙寅월 …).
 * - 일주: 출생지 표준시(서머타임 제외)의 날짜. 23시부터는 다음 날로 본다(子初換日).
 * - 시주: 같은 표준시로 12지시를 정하고, 시간은 일간에서 정한다(日上起時法: 甲己일 → 甲子시 …).
 * - 태양 황경: Meeus, Astronomical Algorithms 25장 저정밀식(오차 약 0.01°, 절입 시각 기준 ±15분 안팎).
 * - 진태양시(경도) 보정은 출생 도시를 받지 않으므로 적용하지 않는다.
 */

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
/** Unix 기준 시각(1970-01-01T00:00Z)의 율리우스일 */
const UNIX_EPOCH_JD = 2440587.5;
/** 태양이 황도를 하루에 움직이는 평균 각도(°) */
const SOLAR_DEGREES_PER_DAY = 0.9856;
/** 입춘(立春) 황경 — 사주의 한 해와 寅月이 시작되는 지점 */
const LICHUN_LONGITUDE = 315;
/** 절입 시각과 이만큼 가까우면 월주가 민감하다고 알린다 */
const NEAR_SOLAR_TERM_HOURS = 2;

/** ΔT(지구시 − 세계시, 초) — Espenak & Meeus 관측·예측값. 사이 값은 선형 보간 */
const DELTA_T: readonly [year: number, seconds: number][] = [
  [1900, -2.8],
  [1910, 10.4],
  [1920, 21.2],
  [1930, 24.0],
  [1940, 24.3],
  [1950, 29.1],
  [1960, 33.1],
  [1970, 40.2],
  [1980, 50.5],
  [1990, 56.9],
  [2000, 63.8],
  [2010, 66.1],
  [2020, 69.4],
  [2030, 72.0],
  [2050, 80.0],
];

export function computeSajuReading(birth: BirthInfo): SajuReading {
  const date = parseIsoDate(birth.date);
  if (!date) throw new RangeError(`Invalid birth date: ${birth.date}`);
  const clock = birth.time ? parseClock(birth.time) : null;
  const notes: SajuNote[] = [];

  // 연·월주: 절대 시각의 태양 황경으로 정한다. 시각을 모르면 그날 정오를 기준으로 삼는다
  const { instant, ambiguous } = resolveWallTime(
    { ...date, hour: clock?.hour ?? 12, minute: clock?.minute ?? 0 },
    birth.timeZone,
  );
  if (clock && ambiguous) notes.push("ambiguous-time");
  const longitude = apparentSolarLongitude(instant);
  const sajuYear = sajuYearOf(instant, longitude);
  const yearStem = mod(sajuYear - 4, 10);
  const yearPillar = makePillar(yearStem, sajuYear - 4);
  const sector = solarMonthSector(longitude);
  const monthPillar = makePillar(
    mod(yearStem * 2 + 2, 10) + sector,
    sector + 2,
  );

  // 일·시주: 출생지 표준시(서머타임 제외)로 정한다
  const dst = getDstShiftMinutes(instant, birth.timeZone);
  const standardOffset = getUtcOffsetMinutes(instant, birth.timeZone) - dst;
  const local = new Date(instant + standardOffset * MINUTE_MS);
  const localDate = clock
    ? {
        year: local.getUTCFullYear(),
        month: local.getUTCMonth() + 1,
        day: local.getUTCDate(),
      }
    : date;
  const localMinutes = clock
    ? local.getUTCHours() * 60 + local.getUTCMinutes()
    : null;

  if (clock && dst > 0) notes.push("dst-removed");
  const lateZi = localMinutes !== null && localMinutes >= 23 * 60;
  if (lateZi) notes.push("late-zi-hour");

  // 60갑자 일진: 율리우스 적일(JDN) − 11을 60으로 나눈 나머지가 0이면 甲子일
  const dayIndex = mod(julianDayNumber(localDate) - 11 + (lateZi ? 1 : 0), 60);
  const dayStemIndex = dayIndex % 10;
  const hourPillar =
    localMinutes === null ? null : hourPillarAt(localMinutes, dayStemIndex);

  if (!clock) {
    notes.push("hour-unknown");
    // 출생일 하루 안에 절입이 있으면 태어난 시각에 따라 월주가 달라진다
    const start = zonedTimeToInstant(
      { ...date, hour: 0, minute: 0 },
      birth.timeZone,
    );
    const startSector = solarMonthSector(apparentSolarLongitude(start));
    const endSector = solarMonthSector(apparentSolarLongitude(start + DAY_MS));
    if (startSector !== endSector) notes.push("solar-term-day");
  } else if (hoursToNearestSolarTerm(longitude) < NEAR_SOLAR_TERM_HOURS) {
    notes.push("near-solar-term");
  }

  const chart: SajuChart = {
    year: yearPillar,
    month: monthPillar,
    day: pillarFromCycleIndex(dayIndex),
    hour: hourPillar,
  };
  const dayStem = HEAVENLY_STEMS[dayStemIndex];

  return {
    chart,
    dayMaster: {
      stem: dayStem.id,
      hanja: dayStem.hanja,
      element: dayStem.element,
      yinYang: dayStem.yinYang,
    },
    ...countElements(chart),
    standardTime: {
      date: formatDate(localDate),
      time:
        localMinutes === null
          ? null
          : `${pad(Math.floor(localMinutes / 60))}:${pad(localMinutes % 60)}`,
      utcOffset: formatUtcOffset(standardOffset),
    },
    notes,
  };
}

// ─── 천문 계산 ──────────────────────────────────────────────

/** 겉보기 태양 황경(°, 0 ≤ λ < 360) — Meeus 25장 저정밀식 */
export function apparentSolarLongitude(instantMs: number): number {
  const julianDay = instantMs / DAY_MS + UNIX_EPOCH_JD;
  const year = new Date(instantMs).getUTCFullYear();
  const t = (julianDay + deltaTSeconds(year) / 86_400 - 2451545) / 36525;

  const meanLongitude = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const meanAnomaly = toRadians(
    357.52911 + 35999.05029 * t - 0.0001537 * t * t,
  );
  const equationOfCenter =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(meanAnomaly) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * meanAnomaly) +
    0.000289 * Math.sin(3 * meanAnomaly);
  const omega = toRadians(125.04 - 1934.136 * t);

  return mod(
    meanLongitude + equationOfCenter - 0.00569 - 0.00478 * Math.sin(omega),
    360,
  );
}

function deltaTSeconds(year: number): number {
  if (year <= DELTA_T[0][0]) return DELTA_T[0][1];
  for (let index = 1; index < DELTA_T.length; index++) {
    const [y1, s1] = DELTA_T[index];
    if (year <= y1) {
      const [y0, s0] = DELTA_T[index - 1];
      return s0 + ((s1 - s0) * (year - y0)) / (y1 - y0);
    }
  }
  return DELTA_T[DELTA_T.length - 1][1];
}

/** 입춘 전(1–2월이면서 황경 315° 미만)이면 지난해로 본다 */
function sajuYearOf(instantMs: number, longitude: number): number {
  const utc = new Date(instantMs);
  const year = utc.getUTCFullYear();
  return utc.getUTCMonth() < 2 && longitude < LICHUN_LONGITUDE
    ? year - 1
    : year;
}

/** 절기 월 순번 — 0 = 寅月(입춘~경칩) … 11 = 丑月(소한~입춘) */
function solarMonthSector(longitude: number): number {
  return Math.floor(mod(longitude - LICHUN_LONGITUDE, 360) / 30);
}

function hoursToNearestSolarTerm(longitude: number): number {
  const within = mod(longitude - LICHUN_LONGITUDE, 30);
  return (Math.min(within, 30 - within) / SOLAR_DEGREES_PER_DAY) * 24;
}

/** 12지시: 23:00–00:59 子, 01:00–02:59 丑 … */
function hourPillarAt(minutes: number, dayStemIndex: number) {
  const branch = Math.floor(mod(minutes + 60, 1440) / 120);
  return makePillar(mod(dayStemIndex * 2, 10) + branch, branch);
}

/** 그레고리력 날짜의 율리우스 적일(Julian Day Number) */
export function julianDayNumber({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// ─── 보조 ──────────────────────────────────────────────────

function countElements(chart: SajuChart): {
  elementBalance: ElementBalance;
  yinYang: Record<YinYang, number>;
} {
  const elementBalance: ElementBalance = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
  const yinYang: Record<YinYang, number> = { yang: 0, yin: 0 };

  for (const pillar of [chart.year, chart.month, chart.day, chart.hour]) {
    if (!pillar) continue;
    const stem = HEAVENLY_STEMS[stemIndexOf(pillar.stem)];
    const branch = EARTHLY_BRANCHES[branchIndexOf(pillar.branch)];
    for (const glyph of [stem, branch]) {
      elementBalance[glyph.element] += 1;
      yinYang[glyph.yinYang] += 1;
    }
  }
  return { elementBalance, yinYang };
}

function parseClock(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

const pad = (value: number) => String(value).padStart(2, "0");
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function formatDate({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}
