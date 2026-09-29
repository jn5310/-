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
