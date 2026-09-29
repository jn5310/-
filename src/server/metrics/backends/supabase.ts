import "server-only";

import type {
  Counters,
  DailyMetrics,
  MetricsBackend,
  PaymentQuery,
  PaymentRecord,
} from "../types";

/*
 * Supabase(Postgres) 지표 저장소 — SQL로 조회·CSV 내보내기가 쉬워 매각 실사 자료로 가장 설득력이 있다.
 * 표와 함수는 supabase/migrations/20260929000000_kns_metrics.sql로 만든다.
 *
 * 서버 전용 비밀 키로만 접근한다: 새 비밀 키(sb_secret_…) 또는 옛 service_role 키(JWT, 2026년 말 폐지 예정).
 * 표에는 RLS를 켜고 정책을 두지 않아 공개 키(publishable / anon)로는 읽을 수도 쓸 수도 없다.
 * 쓰기는 두 함수(kns_record_metrics · kns_record_payment)로만 한다 — 결제 원장과 합계가 한 트랜잭션에서 함께 바뀐다.
 */

const TIMEOUT_MS = 5_000;
const MIGRATION_HINT = "run supabase/migrations/20260929000000_kns_metrics.sql";
const PAYMENT_COLUMNS =
  "checkout_session_id,payment_intent_id,amount_total,currency,livemode,country,reading_ref,recorded_at";

interface PaymentRow {
  checkout_session_id: string;
  payment_intent_id: string | null;
  amount_total: number;
  currency: string;
  livemode: boolean;
  country: string | null;
  reading_ref: string;
  recorded_at: string;
}

export class SupabaseMetricsBackend implements MetricsBackend {
  readonly kind = "supabase" as const;
  private readonly baseUrl: string;

  constructor(
    url: string,
    private readonly secretKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = `${url.replace(/\/+$/, "")}/rest/v1`;
  }

  async record(
    day: string,
    counters: Counters,
    visitorHash?: string,
  ): Promise<void> {
    await this.request("rpc/kns_record_metrics", {
      method: "POST",
      body: {
        p_day: day,
        p_counters: counters,
        p_visitor: visitorHash ?? null,
      },
    });
  }

  async appendPayment(
    record: PaymentRecord,
    day: string,
    counters: Counters,
  ): Promise<"recorded" | "duplicate"> {
    // true: 새로 기록 · false: 이미 있는 결제 (함수 안에서 원장 삽입과 카운터 증가를 한 번에 한다)
    const recorded = await this.request("rpc/kns_record_payment", {
      method: "POST",
      body: {
        p_checkout_session_id: record.checkoutSessionId,
        p_payment_intent_id: record.paymentIntentId,
        p_amount_total: record.amountTotal,
        p_currency: record.currency,
        p_livemode: record.livemode,
        p_country: record.country,
        p_reading_ref: record.readingRef,
        p_recorded_at: record.recordedAt,
        p_day: day,
        p_counters: counters,
      },
    });
    return recorded === true ? "recorded" : "duplicate";
  }

  async readDaily(days: string[]): Promise<DailyMetrics[]> {
    if (days.length === 0) return [];
    const sorted = [...days].sort();
    const query = new URLSearchParams({
      select: "day,visitors,counters",
      order: "day.asc",
    });
    query.append("day", `gte.${sorted[0]}`);
    query.append("day", `lte.${sorted[sorted.length - 1]}`);
    const rows = ((await this.request(`kns_metrics_daily?${query}`, {
      method: "GET",
    })) ?? []) as { day: string; visitors: number; counters: Counters }[];
    const byDay = new Map(rows.map((row) => [row.day, row]));
    return days.map((day) => ({
      day,
      visitors: Number(byDay.get(day)?.visitors ?? 0),
      counters: normalizeCounters(byDay.get(day)?.counters),
    }));
  }

  async readPayments({
    limit,
    from,
    to,
  }: PaymentQuery): Promise<PaymentRecord[]> {
    const query = new URLSearchParams({
      select: PAYMENT_COLUMNS,
      order: "recorded_at.desc",
      limit: String(limit),
    });
    if (from) query.append("recorded_at", `gte.${from}T00:00:00Z`);
    if (to) query.append("recorded_at", `lt.${nextDay(to)}T00:00:00Z`);
    const rows = ((await this.request(`kns_payments?${query}`, {
      method: "GET",
    })) ?? []) as PaymentRow[];
    return rows.map(fromRow);
  }

  private async request(
    path: string,
    { method, body }: { method: "GET" | "POST"; body?: unknown },
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      apikey: this.secretKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    // 옛 service_role 키(JWT)만 Authorization에도 싣는다 — 새 비밀 키는 JWT가 아니라 apikey 헤더로만 보낸다
    if (isLegacyJwtKey(this.secretKey)) {
      headers.Authorization = `Bearer ${this.secretKey}`;
    }

    const response = await this.fetchImpl(`${this.baseUrl}/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) {
      const endpoint = path.split("?")[0];
      // 404: 표·함수가 없다 (마이그레이션을 실행하지 않음)
      const hint = response.status === 404 ? ` (${MIGRATION_HINT})` : "";
      throw new Error(
        `Supabase ${method} ${endpoint} → HTTP ${response.status}${hint}: ${text.slice(0, 300)}`,
      );
    }
    return text ? (JSON.parse(text) as unknown) : null;
  }
}

/** 옛 키는 "eyJ"로 시작하는 JWT, 새 키는 sb_secret_… */
function isLegacyJwtKey(key: string): boolean {
  return key.startsWith("eyJ") && key.split(".").length === 3;
}

function normalizeCounters(value: unknown): Counters {
  const counters: Counters = {};
  if (value && typeof value === "object") {
    for (const [key, count] of Object.entries(value)) {
      counters[key] = Number(count) || 0;
    }
  }
  return counters;
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function fromRow(row: PaymentRow): PaymentRecord {
  return {
    checkoutSessionId: row.checkout_session_id,
    paymentIntentId: row.payment_intent_id,
    amountTotal: Number(row.amount_total),
    currency: row.currency,
    livemode: Boolean(row.livemode),
    country: row.country,
    readingRef: row.reading_ref,
    // Postgres는 접속 시간대로 돌려준다 — 날짜 묶음이 어긋나지 않게 UTC ISO로 맞춘다
    recordedAt: new Date(row.recorded_at).toISOString(),
  };
}
