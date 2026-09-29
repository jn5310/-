export interface TimeZoneGroup {
  region: string;
  zones: { value: string; label: string }[];
}

let cachedTimeZones: readonly string[] | undefined;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** 기기(브라우저)에 설정된 IANA 시간대 */
export function getBrowserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * 런타임이 지원하는 IANA 시간대 목록.
 * useSyncExternalStore 스냅샷으로 쓰이므로 매 호출마다 같은 배열 참조를 돌려준다.
 */
export function getSupportedTimeZones(): readonly string[] {
  if (!cachedTimeZones) {
    const zones =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [];
    cachedTimeZones = zones.includes("UTC") ? zones : [...zones, "UTC"];
  }
  return cachedTimeZones;
}

/** 목록에 없는 시간대(예: 브라우저가 돌려준 별칭)를 보존해 선택 상태가 사라지지 않게 한다 */
export function withTimeZone(
  zones: readonly string[],
  timeZone: string | null,
): readonly string[] {
  if (!timeZone || zones.length === 0 || zones.includes(timeZone)) return zones;
  return [...zones, timeZone].sort();
}

/** "America/New_York" → { region: "America", label: "New York" } 형태로 묶는다 */
export function groupTimeZones(zones: readonly string[]): TimeZoneGroup[] {
  const groups = new Map<string, TimeZoneGroup>();

  for (const zone of zones) {
    const slash = zone.indexOf("/");
    const region = slash === -1 ? "Other" : zone.slice(0, slash);
    const label = (slash === -1 ? zone : zone.slice(slash + 1))
      .replace(/_/g, " ")
      .replace(/\//g, " / ");

    const group = groups.get(region) ?? { region, zones: [] };
    group.zones.push({ value: zone, label });
    groups.set(region, group);
  }

  return [...groups.values()];
}

// ─── 서버 검증용 정규화 ─────────────────────────────────────

const MAX_TIME_ZONE_LENGTH = 64;
let supportedTimeZoneSet: ReadonlySet<string> | undefined;

/**
 * 시간대를 런타임의 정식 IANA 이름으로 바꾼다 (예: "asia/seoul" → "Asia/Seoul").
 * 지원 목록에 없는 값(고정 오프셋 "+09:00" 등)이나 너무 긴 문자열이면 null.
 * 서버는 이 값만 받아 쓴다 — 표기가 제각각인 입력으로 캐시가 끝없이 늘어나지 않게 한다.
 */
export function toCanonicalTimeZone(value: string): string | null {
  if (!value || value.length > MAX_TIME_ZONE_LENGTH) return null;
  let canonical: string;
  try {
    canonical = new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
  supportedTimeZoneSet ??= new Set(getSupportedTimeZones());
  return supportedTimeZoneSet.has(canonical) ? canonical : null;
}

// ─── 벽시계 시각 ↔ 절대 시각 (사주 계산용) ─────────────────────

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
/** 서머타임 경계를 찾을 때 앞뒤로 살펴볼 최대 기간 — 전시(戰時) 서머타임처럼 몇 년씩 이어진 경우까지 */
const DST_SEARCH_LIMIT_MS = 5 * 366 * DAY_MS;
const DST_SEARCH_STEP_MS = 7 * DAY_MS;
/** 겹쳐 적용된 서머타임(예: 영국 1941–45년 이중 서머타임)을 몇 겹까지 벗길지 */
const MAX_DST_LAYERS = 3;
const MAX_CACHED_FORMATTERS = 64;

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = offsetFormatters.get(timeZone);
  if (formatter) {
    // 최근에 쓴 항목을 뒤로 보내 LRU 순서를 유지한다
    offsetFormatters.delete(timeZone);
  } else {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    if (offsetFormatters.size >= MAX_CACHED_FORMATTERS) {
      offsetFormatters.delete(offsetFormatters.keys().next().value!);
    }
  }
  offsetFormatters.set(timeZone, formatter);
  return formatter;
}

/**
 * 특정 순간의 UTC 오프셋(분). 예: Asia/Seoul → 540
 * 1900년대 초의 지방 평균시(LMT)처럼 초 단위 오프셋이면 소수가 나올 수 있다.
 */
export function getUtcOffsetMinutes(
  instantMs: number,
  timeZone: string,
): number {
  const seconds = Math.floor(instantMs / 1000) * 1000;
  const parts = getOffsetFormatter(timeZone).formatToParts(new Date(seconds));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wallAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (wallAsUtc - seconds) / MINUTE_MS;
}

export interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * 시간대의 벽시계 시각 → 절대 시각(ms).
 *
 * 서머타임이 끝나는 밤에는 같은 시각이 두 번 있고(ambiguous), 시작하는 밤에는 없는 시각이 있다.
 * 두 경우 모두 ambiguous: true로 알린다. 두 번 있는 시각은 먼저 오는 쪽(서머타임)을,
 * 없는 시각은 전환 전 오프셋(표준시)으로 읽는다.
 */
export function resolveWallTime(
  wall: WallTime,
  timeZone: string,
): { instant: number; ambiguous: boolean } {
  const wallMs = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  const before = getUtcOffsetMinutes(wallMs - DAY_MS, timeZone);
  const after = getUtcOffsetMinutes(wallMs + DAY_MS, timeZone);
  const candidates = [...new Set([before, after])]
    .map((offset) => ({ offset, instant: wallMs - offset * MINUTE_MS }))
    .filter(
      ({ offset, instant }) =>
        getUtcOffsetMinutes(instant, timeZone) === offset,
    )
    .map(({ instant }) => instant)
    .sort((a, b) => a - b);

  if (candidates.length === 1) {
    return { instant: candidates[0], ambiguous: false };
  }
  if (candidates.length > 1) return { instant: candidates[0], ambiguous: true };
  return { instant: wallMs - before * MINUTE_MS, ambiguous: true };
}

export function zonedTimeToInstant(wall: WallTime, timeZone: string): number {
  return resolveWallTime(wall, timeZone).instant;
}

/**
 * fromMs에서 direction 쪽으로 가다가 오프셋이 level보다 작아지는 첫 경계.
 * 일주일 간격으로 훑은 뒤 이분 탐색으로 경계를 1분 단위까지 좁힌다.
 * @returns 경계 직전 시각(at, 오프셋 ≥ level)과 경계 너머의 오프셋 — 없으면 null
 */
function findDropBelow(
  fromMs: number,
  level: number,
  timeZone: string,
  direction: 1 | -1,
): { at: number; offset: number } | null {
  let inside = fromMs;
  for (
    let traveled = DST_SEARCH_STEP_MS;
    traveled <= DST_SEARCH_LIMIT_MS;
    traveled += DST_SEARCH_STEP_MS
  ) {
    const probe = fromMs + direction * traveled;
    if (getUtcOffsetMinutes(probe, timeZone) >= level) {
      inside = probe;
      continue;
    }
    let outside = probe;
    while (Math.abs(outside - inside) > MINUTE_MS) {
      const middle = Math.floor((inside + outside) / 2);
      if (getUtcOffsetMinutes(middle, timeZone) >= level) inside = middle;
      else outside = middle;
    }
    return { at: inside, offset: getUtcOffsetMinutes(outside, timeZone) };
  }
  return null;
}

/**
 * 그 순간에 적용 중인 서머타임(분). 서머타임이 아니면 0.
 *
 * IANA 데이터는 서머타임 여부를 직접 알려 주지 않는다. 그래서 그 순간이 속한 구간이 앞뒤 구간보다
 * 오프셋이 높으면(앞뒤 5년 안에서 양쪽 모두 낮아지는 경계가 있으면) 서머타임으로 보고 그 차이를 뺀다.
 * - 기간 제한을 두지 않아 1974년 미국 에너지 위기 서머타임(294일)·전시 서머타임(1942–45)도 잡는다.
 * - 겹친 서머타임(영국 이중 서머타임 +2)은 한 겹씩 벗긴다.
 * - 표준시 자체가 바뀐 경우(예: 1961년 한국 +8:30 → +9:00)는 한쪽이 낮아지지 않으므로 0이다.
 */
export function getDstShiftMinutes(
  instantMs: number,
  timeZone: string,
): number {
  let level = getUtcOffsetMinutes(instantMs, timeZone);
  let left = instantMs;
  let right = instantMs;
  let shift = 0;

  for (let layer = 0; layer < MAX_DST_LAYERS; layer++) {
    const before = findDropBelow(left, level, timeZone, -1);
    const after = findDropBelow(right, level, timeZone, 1);
    if (!before || !after) break;
    const base = Math.max(before.offset, after.offset);
    shift += level - base;
    level = base;
    left = before.at;
    right = after.at;
  }
  return shift;
}

/** 540 → "+09:00", -270 → "-04:30" */
export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const total = Math.round(Math.abs(minutes));
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  return `${sign}${hours}:${String(total % 60).padStart(2, "0")}`;
}
