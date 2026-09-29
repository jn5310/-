import "server-only";

import type { RedisCommand, UpstashRest } from "@/server/storage/upstash-rest";

import type {
  Counters,
  DailyMetrics,
  MetricsBackend,
  PaymentQuery,
  PaymentRecord,
} from "../types";

/*
 * Vercel KV(Upstash Redis) 지표 저장소 — 풀이 저장소와 같은 데이터베이스를 쓴다 (추가 서비스 없음).
 *
 *   kns:metrics:daily:<YYYY-MM-DD>     HASH         카운터 (HINCRBY)
 *   kns:metrics:visitors:<YYYY-MM-DD>  HyperLogLog  순 방문자 (PFADD / PFCOUNT, 오차 약 0.8%)
 *   kns:metrics:payment:<세션 ID>       STRING       결제 중복 방지 표시 (SET NX)
 *   kns:metrics:payments               LIST         결제 원장 (RPUSH, JSON 한 줄씩 — 오래된 것부터)
 *
 * 개인 정보가 없는 사업 기록이라 만료(TTL)를 두지 않는다 — 매각 때 전체 기간을 보여 줄 수 있어야 한다.
 */

const PREFIX = "kns:metrics";
const PAYMENTS_KEY = `${PREFIX}:payments`;
/** 원장을 한 번에 읽는 줄 수 (응답 크기 제한) */
const PAYMENT_PAGE_SIZE = 500;
/** 원장을 최대 이만큼(40 × 500줄)만 거슬러 읽는다 */
const MAX_PAYMENT_PAGES = 40;

/**
 * 결제 표시·원장·카운터를 한 번에(원자적으로) 쓴다 — 중간에 끊겨 원장과 합계가 어긋나지 않게.
 * KEYS: 결제 표시, 원장, 그날 카운터 · ARGV: 기록 시각, 원장 JSON, 카운터 이름·값 쌍…
 */
const APPEND_PAYMENT_SCRIPT = `
if not redis.call('SET', KEYS[1], ARGV[1], 'NX') then
  return 0
end
redis.call('RPUSH', KEYS[2], ARGV[2])
for i = 3, #ARGV, 2 do
  redis.call('HINCRBY', KEYS[3], ARGV[i], ARGV[i + 1])
end
return 1
`;

export class UpstashMetricsBackend implements MetricsBackend {
  readonly kind = "upstash" as const;

  constructor(private readonly client: UpstashRest) {}

  async record(
    day: string,
    counters: Counters,
    visitorHash?: string,
  ): Promise<void> {
    const commands: RedisCommand[] = Object.entries(counters).map(
      ([field, value]) => [
        "HINCRBY",
        `${PREFIX}:daily:${day}`,
        field,
        Math.round(value),
      ],
    );
    if (visitorHash) {
      commands.push(["PFADD", `${PREFIX}:visitors:${day}`, visitorHash]);
    }
    await this.client.pipeline(commands);
  }

  async appendPayment(
    record: PaymentRecord,
    day: string,
    counters: Counters,
  ): Promise<"recorded" | "duplicate"> {
    const result = await this.client.command([
      "EVAL",
      APPEND_PAYMENT_SCRIPT,
      3,
      `${PREFIX}:payment:${record.checkoutSessionId}`,
      PAYMENTS_KEY,
      `${PREFIX}:daily:${day}`,
      record.recordedAt,
      JSON.stringify(record),
      ...Object.entries(counters).flatMap(([field, value]) => [
        field,
        Math.round(value),
      ]),
    ]);
    return Number(result) === 1 ? "recorded" : "duplicate";
  }

  async readDaily(days: string[]): Promise<DailyMetrics[]> {
    const commands: RedisCommand[] = days.flatMap((day): RedisCommand[] => [
      ["HGETALL", `${PREFIX}:daily:${day}`],
      ["PFCOUNT", `${PREFIX}:visitors:${day}`],
    ]);
    const results = await this.client.pipeline(commands);
    return days.map((day, index) => ({
      day,
      counters: hashToCounters(results[index * 2]),
      visitors: Number(results[index * 2 + 1] ?? 0),
    }));
  }

  /** 원장 끝(최근)부터 거꾸로 한 쪽씩 읽고, from보다 오래된 줄에 닿으면 멈춘다 */
  async readPayments({
    limit,
    from,
    to,
  }: PaymentQuery): Promise<PaymentRecord[]> {
    const found: PaymentRecord[] = [];
    // 읽는 사이 새 결제가 붙으면 음수 위치가 밀려 같은 줄을 두 번 볼 수 있다
    const seen = new Set<string>();
    let end = -1;
    for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
      const start = end - PAYMENT_PAGE_SIZE + 1;
      const rows = await this.client.command([
        "LRANGE",
        PAYMENTS_KEY,
        start,
        end,
      ]);
      if (!Array.isArray(rows) || rows.length === 0) break;

      let reachedOlder = false;
      for (const row of [...rows].reverse()) {
        const record = parseRecord(row);
        if (!record || seen.has(record.checkoutSessionId)) continue;
        seen.add(record.checkoutSessionId);
        const day = record.recordedAt.slice(0, 10);
        if (to && day > to) continue;
        if (from && day < from) {
          reachedOlder = true;
          continue;
        }
        found.push(record);
        if (found.length >= limit) return found;
      }
      if (reachedOlder || rows.length < PAYMENT_PAGE_SIZE) break;
      end = start - 1;
    }
    return found;
  }
}

function parseRecord(row: unknown): PaymentRecord | null {
  try {
    const record = JSON.parse(String(row)) as PaymentRecord;
    return typeof record?.checkoutSessionId === "string" &&
      typeof record.recordedAt === "string"
      ? record
      : null;
  } catch {
    return null;
  }
}

/** HGETALL 결과: ["field", "value", …] 배열 (REST) 또는 객체 */
function hashToCounters(result: unknown): Counters {
  const counters: Counters = {};
  if (Array.isArray(result)) {
    for (let index = 0; index + 1 < result.length; index += 2) {
      counters[String(result[index])] = Number(result[index + 1]) || 0;
    }
  } else if (result && typeof result === "object") {
    for (const [key, value] of Object.entries(result)) {
      counters[key] = Number(value) || 0;
    }
  }
  return counters;
}
