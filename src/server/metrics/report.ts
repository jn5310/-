import "server-only";

import type {
  Counters,
  DailyMetrics,
  MetricsBackend,
  PaymentRecord,
} from "./types";

/*
 * 지표 보고서 — 매각 실사(Flippa 등)에 내는 일별·월별 트래픽·전환·매출 표와 결제 원장 CSV.
 * 매출은 Stripe 수수료·환불을 빼기 전 금액(총매출)이다. 실결제(livemode)와 테스트 결제는 따로 센다.
 */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const METRIC_COLUMNS = [
  "visitors",
  "visits",
  "pageviews",
  "readings_created",
  "saju_readings",
  "checkouts_started",
  "payments",
  "revenue_cents",
  "payments_test",
  "revenue_cents_test",
] as const;

export type MetricColumn = (typeof METRIC_COLUMNS)[number];
export type MetricValues = Record<MetricColumn, number>;
export type DailyRow = { day: string } & MetricValues;
export type MonthlyRow = { month: string; days: number } & MetricValues;

export interface Conversion {
  /** 방문 → 풀이 생성 */
  visitToReading: number | null;
  /** 풀이 생성 → 결제 버튼 */
  readingToCheckout: number | null;
  /** 결제 버튼 → 결제 완료 */
  checkoutToPayment: number | null;
  /** 방문 → 결제 완료 */
  visitToPayment: number | null;
}

export interface MetricsReport {
  backend: MetricsBackend["kind"];
  range: { from: string; to: string; days: number };
  generatedAt: string;
  /** visitors는 일별 순 방문자의 합이다 (같은 사람이 이틀 오면 2) */
  totals: MetricValues;
  conversion: Conversion;
  /** 실결제 1건 평균 금액 (센트) */
  averageOrderValueCents: number | null;
  breakdowns: {
    pages: Record<string, number>;
    countries: Record<string, number>;
    sources: Record<string, number>;
    devices: Record<string, number>;
  };
  /** USD가 아닌 통화로 들어온 매출 (최소 통화 단위) — 보통 비어 있다 */
  otherCurrencyRevenue: Record<string, number>;
  monthly: MonthlyRow[];
  daily: DailyRow[];
}

// ─── 날짜 ────────────────────────────────────────────────────

export function isIsoDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** from부터 to까지(포함) 날짜 목록 */
export function daysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) days.push(day);
  return days;
}

// ─── 집계 ────────────────────────────────────────────────────

function emptyValues(): MetricValues {
  return Object.fromEntries(
    METRIC_COLUMNS.map((column) => [column, 0]),
  ) as MetricValues;
}

export function toDailyRow(metrics: DailyMetrics): DailyRow {
  const values = emptyValues();
  for (const column of METRIC_COLUMNS) {
    values[column] =
      column === "visitors"
        ? metrics.visitors
        : (metrics.counters[column] ?? 0);
  }
  return { day: metrics.day, ...values };
}

function addValues(target: MetricValues, source: MetricValues): void {
  for (const column of METRIC_COLUMNS) target[column] += source[column];
}

export function toMonthlyRows(rows: DailyRow[]): MonthlyRow[] {
  const months = new Map<string, MonthlyRow>();
  for (const row of rows) {
    const month = row.day.slice(0, 7);
    let entry = months.get(month);
    if (!entry) {
      entry = { month, days: 0, ...emptyValues() };
      months.set(month, entry);
    }
    entry.days += 1;
    addValues(entry, row);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

const ratio = (numerator: number, denominator: number) =>
  denominator > 0
    ? Math.round((numerator / denominator) * 10_000) / 10_000
    : null;

export function conversionOf(values: MetricValues): Conversion {
  return {
    visitToReading: ratio(values.readings_created, values.visits),
    readingToCheckout: ratio(values.checkouts_started, values.readings_created),
    checkoutToPayment: ratio(values.payments, values.checkouts_started),
    visitToPayment: ratio(values.payments, values.visits),
  };
}

/** "page:/" · "country:US" 같은 접두어 카운터를 합쳐 큰 순서로 */
function breakdown(
  daily: DailyMetrics[],
  prefix: string,
  limit = 50,
): Record<string, number> {
  const totals = new Map<string, number>();
  for (const { counters } of daily) {
    for (const [key, value] of Object.entries(counters)) {
      if (!key.startsWith(prefix)) continue;
      const name = key.slice(prefix.length);
      totals.set(name, (totals.get(name) ?? 0) + value);
    }
  }
  return Object.fromEntries(
    [...totals.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit),
  );
}

export async function readMetricsReport(
  backend: MetricsBackend,
  range: { from: string; to: string },
  now: Date = new Date(),
): Promise<MetricsReport> {
  const days = daysInRange(range.from, range.to);
  const metrics = await backend.readDaily(days);
  const daily = metrics.map(toDailyRow);
  const totals = emptyValues();
  for (const row of daily) addValues(totals, row);

  const otherCurrencyRevenue: Counters = {};
  for (const { counters } of metrics) {
    for (const [key, value] of Object.entries(counters)) {
      if (key.startsWith("revenue_minor:")) {
        const currency = key.slice("revenue_minor:".length);
        otherCurrencyRevenue[currency] =
          (otherCurrencyRevenue[currency] ?? 0) + value;
      }
    }
  }

  return {
    backend: backend.kind,
    range: { from: range.from, to: range.to, days: days.length },
    generatedAt: now.toISOString(),
    totals,
    conversion: conversionOf(totals),
    averageOrderValueCents:
      totals.payments > 0
        ? Math.round(totals.revenue_cents / totals.payments)
        : null,
    breakdowns: {
      pages: breakdown(metrics, "page:"),
      countries: breakdown(metrics, "country:"),
      sources: breakdown(metrics, "source:"),
      devices: breakdown(metrics, "device:"),
    },
    otherCurrencyRevenue,
    monthly: toMonthlyRows(daily),
    daily,
  };
}

// ─── CSV ─────────────────────────────────────────────────────

type Cell = string | number | boolean | null | undefined;

/**
 * CSV 한 칸. 스프레드시트가 수식으로 실행하지 않도록 =·+·-·@·탭·CR로 시작하는 문자열 앞에 '를 붙인다
 * (CSV 주입 방지 — 유입 경로 이름 같은 값은 외부에서 들어온다).
 */
export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return (
    [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

/** Stripe의 소수점 없는 통화 — 최소 단위가 곧 1원·1엔이다 */
// prettier-ignore
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

function formatAmount(minor: number, currency: string): string {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? String(minor) : dollars(minor);
}

export function dailyCsv(rows: DailyRow[]): string {
  return toCsv(
    [
      "day",
      "visitors",
      "visits",
      "pageviews",
      "readings_created",
      "saju_readings",
      "checkouts_started",
      "payments",
      "revenue_usd",
      "payments_test",
      "revenue_usd_test",
    ],
    rows.map((row) => [
      row.day,
      row.visitors,
      row.visits,
      row.pageviews,
      row.readings_created,
      row.saju_readings,
      row.checkouts_started,
      row.payments,
      dollars(row.revenue_cents),
      row.payments_test,
      dollars(row.revenue_cents_test),
    ]),
  );
}

export function monthlyCsv(rows: MonthlyRow[]): string {
  return toCsv(
    [
      "month",
      "days_recorded",
      "visitors_daily_sum",
      "visits",
      "pageviews",
      "readings_created",
      "saju_readings",
      "checkouts_started",
      "payments",
      "revenue_usd",
      "visit_to_payment_rate",
    ],
    rows.map((row) => [
      row.month,
      row.days,
      row.visitors,
      row.visits,
      row.pageviews,
      row.readings_created,
      row.saju_readings,
      row.checkouts_started,
      row.payments,
      dollars(row.revenue_cents),
      conversionOf(row).visitToPayment,
    ]),
  );
}

export function paymentsCsv(payments: PaymentRecord[]): string {
  return toCsv(
    [
      "recorded_at",
      "checkout_session_id",
      "payment_intent_id",
      "amount",
      "currency",
      "livemode",
      "country",
      "reading_ref",
    ],
    payments.map((payment) => [
      payment.recordedAt,
      payment.checkoutSessionId,
      payment.paymentIntentId,
      formatAmount(payment.amountTotal, payment.currency),
      payment.currency,
      payment.livemode,
      payment.country,
      payment.readingRef,
    ]),
  );
}
