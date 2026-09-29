/*
 * 매각 실사용 지표 — "얼마나 방문했고, 몇 명이 결제했는가"를 날짜별로 남긴다.
 * 개인 정보(이름·이메일·IP·풀이 ID)는 저장하지 않는다. 방문자는 날마다 바뀌는 해시로만 센다.
 */

/** 날짜별 카운터 — 예) { pageviews: 120, "page:/": 80, "country:US": 40, payments: 3 } */
export type Counters = Record<string, number>;

export interface DailyMetrics {
  /** UTC 날짜 YYYY-MM-DD */
  day: string;
  /** 그날 순 방문자 수 (날마다 바뀌는 해시 기준) */
  visitors: number;
  counters: Counters;
}

/** 결제 원장 한 줄 — Stripe 대시보드와 checkoutSessionId로 대조할 수 있다 */
export interface PaymentRecord {
  checkoutSessionId: string;
  paymentIntentId: string | null;
  /** 최소 통화 단위 (USD 센트) */
  amountTotal: number;
  /** 대문자 통화 코드 (USD) */
  currency: string;
  /** false면 테스트 결제 — 매출 합계에서 뺀다 */
  livemode: boolean;
  /** 카드 청구지 국가 (ISO 3166-1 alpha-2) */
  country: string | null;
  /** 풀이 ID의 해시 — 원장만으로 풀이(접근 권한)를 알아낼 수 없다 */
  readingRef: string;
  recordedAt: string;
}

export interface PaymentQuery {
  limit: number;
  /** 이 날짜(UTC, YYYY-MM-DD)부터 — 포함 */
  from?: string;
  /** 이 날짜까지 — 포함 */
  to?: string;
}

export interface MetricsBackend {
  readonly kind: "upstash" | "supabase" | "file";
  /** 카운터를 더하고, visitorHash가 있으면 순 방문자에 넣는다 */
  record(day: string, counters: Counters, visitorHash?: string): Promise<void>;
  /**
   * 결제 한 건을 원장에 넣고 그날 카운터(payments·revenue_cents)를 더한다 — 둘은 함께 성공하거나 함께 실패한다.
   * 같은 checkoutSessionId는 한 번만 남는다 (웹훅 재전송·결제 복귀 확인이 겹쳐도 안전).
   */
  appendPayment(
    record: PaymentRecord,
    day: string,
    counters: Counters,
  ): Promise<"recorded" | "duplicate">;
  readDaily(days: string[]): Promise<DailyMetrics[]>;
  /** 최근 것부터 */
  readPayments(query: PaymentQuery): Promise<PaymentRecord[]>;
}
