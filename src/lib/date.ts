const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number) => String(value).padStart(2, "0");

/** 로컬 시간 기준 YYYY-MM-DD */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 오늘 날짜(YYYY-MM-DD).
 * @param timeZone 지정하면 그 시간대의 오늘 — 서버에서 출생지 기준으로 판정할 때 쓴다
 */
export function getTodayIsoDate(timeZone?: string): string {
  if (!timeZone) return toIsoDate(new Date());

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "YYYY-MM-DD" → 숫자 연·월·일 (형식이 틀리면 null) */
export function parseIsoDate(
  value: string,
): { year: number; month: number; day: number } | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/** YYYY-MM-DD 형식이면서 달력에 실제로 존재하는 날짜인지 (예: 2023-02-30 → false) */
export function isValidIsoDate(value: string): boolean {
  const parsed = parseIsoDate(value);
  if (!parsed) return false;

  const { year, month, day } = parsed;
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** 표시용: "2000-04-12" → "April 12, 2000" */
export function formatIsoDate(value: string, locale = "en-US"): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
