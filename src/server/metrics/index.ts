import "server-only";

import { createHash } from "node:crypto";
import path from "node:path";

import { runAfterResponse } from "@/server/background";
import { describeError, logEvent } from "@/server/log";
import {
  readUpstashConfig,
  UpstashRest,
  type UpstashConfig,
} from "@/server/storage/upstash-rest";

import { FileMetricsBackend } from "./backends/file";
import { SupabaseMetricsBackend } from "./backends/supabase";
import { UpstashMetricsBackend } from "./backends/upstash";
import type { Counters, MetricsBackend, PaymentRecord } from "./types";
import {
  clientIp,
  pageViewCounters,
  utcDay,
  visitorHash,
  type PageViewContext,
  type PageViewPayload,
} from "./visitor";

/*
 * 매각 실사용 지표 — 방문(쿠키 없는 익명 집계) · 퍼널(풀이 생성 → 결제 시작) · 결제 원장.
 *
 * 저장소 (METRICS_BACKEND, 기본 auto):
 *   supabase  SUPABASE_URL + SUPABASE_SECRET_KEY(또는 옛 SUPABASE_SERVICE_ROLE_KEY) — SQL로 조회·내보내기
 *   kv        Upstash Redis(Vercel KV) — 풀이 저장소와 같은 DB, 추가 가입 없음
 *   file      .data/metrics.json(또는 METRICS_FILE) — 로컬 개발
 *   off       기록하지 않음
 * auto는 Supabase → Upstash → 파일 순으로 고른다. Vercel에서 공유 저장소가 없으면 끈다
 * (서버리스 인스턴스마다 파일이 따로라 숫자가 흩어지기 때문이다).
 *
 * 지표 기록이 실패해도 이름 생성·결제는 그대로 진행된다 — 경고 로그만 남긴다.
 */

type Env = Record<string, string | undefined>;

export type {
  Counters,
  DailyMetrics,
  MetricsBackend,
  PaymentRecord,
} from "./types";

// ─── 저장소 선택 ─────────────────────────────────────────────

export interface SupabaseConfig {
  url: string;
  secretKey: string;
}

/** 서버 전용 비밀 키만 받는다 — 공개 키(sb_publishable_…)는 표에 접근할 수 없다 */
export function readSupabaseConfig(
  env: Env = process.env,
): SupabaseConfig | null {
  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const secretKey = (
    env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();
  if (!url || !secretKey) return null;
  if (
    !/^https?:\/\/[^/\s]+/i.test(url) ||
    secretKey.startsWith("sb_publishable_")
  ) {
    warnOnce(
      "supabase-config",
      "SUPABASE_URL must be the project URL and SUPABASE_SECRET_KEY a secret key (sb_secret_…).",
    );
    return null;
  }
  return { url: url.replace(/\/+$/, ""), secretKey };
}

let cached: { signature: string; backend: MetricsBackend | null } | null = null;

export function getMetricsBackend(
  env: Env = process.env,
): MetricsBackend | null {
  const choice = env.METRICS_BACKEND?.trim().toLowerCase() || "auto";
  const supabase = readSupabaseConfig(env);
  let upstash: UpstashConfig | null = null;
  let upstashProblem: string | null = null;
  try {
    upstash = readUpstashConfig(env);
  } catch (error) {
    upstashProblem = error instanceof Error ? error.message : String(error);
  }
  // 로컬 개발용 파일 경로 — 빌드 추적(Turbopack)에서 빼서 프로젝트 전체가 서버 번들에 실리지 않게 한다
  const file = path.resolve(
    /*turbopackIgnore: true*/ env.METRICS_FILE?.trim() ||
      path.join(process.cwd(), ".data", "metrics.json"),
  );
  const vercel = Boolean(env.VERCEL);

  const signature = JSON.stringify([
    choice,
    supabase,
    upstash,
    upstashProblem,
    file,
    vercel,
  ]);
  if (cached?.signature === signature) return cached.backend;

  const backend = selectBackend(choice, {
    supabase,
    upstash,
    upstashProblem,
    file,
    vercel,
  });
  cached = { signature, backend };
  return backend;
}

function selectBackend(
  choice: string,
  config: {
    supabase: SupabaseConfig | null;
    upstash: UpstashConfig | null;
    upstashProblem: string | null;
    file: string;
    vercel: boolean;
  },
): MetricsBackend | null {
  const supabase = () =>
    new SupabaseMetricsBackend(
      config.supabase!.url,
      config.supabase!.secretKey,
    );
  const upstash = () =>
    new UpstashMetricsBackend(new UpstashRest(config.upstash!));

  switch (choice) {
    case "off":
    case "none":
      return null;
    case "supabase":
      if (config.supabase) return supabase();
      warnOnce(
        "supabase-missing",
        "METRICS_BACKEND=supabase needs SUPABASE_URL and SUPABASE_SECRET_KEY.",
      );
      return null;
    case "kv":
    case "upstash":
      if (config.upstash) return upstash();
      warnOnce(
        "upstash-missing",
        config.upstashProblem ??
          "METRICS_BACKEND=kv needs UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_URL/TOKEN).",
      );
      return null;
    case "file":
      return new FileMetricsBackend(config.file);
    default:
      if (choice !== "auto") {
        warnOnce(
          `unknown:${choice}`,
          `Unknown METRICS_BACKEND "${choice}" — using auto.`,
        );
      }
      if (config.supabase) return supabase();
      if (config.upstash) return upstash();
      if (config.vercel) {
        warnOnce(
          "vercel-no-store",
          "Metrics are off: connect Supabase or Upstash (Vercel KV) to record traffic and payments.",
        );
        return null;
      }
      return new FileMetricsBackend(config.file);
  }
}

const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  logEvent("metrics", "warn", { event: "backend-unavailable", message });
}

/** 지표는 앱을 멈추게 하지 않는다 — 설정을 읽다 오류가 나도 끈 것으로 본다 */
function activeBackend(): MetricsBackend | null {
  try {
    return getMetricsBackend();
  } catch (error) {
    logEvent("metrics", "warn", {
      event: "backend-error",
      ...describeError(error),
    });
    return null;
  }
}

async function guarded(
  backend: MetricsBackend,
  action: string,
  task: () => Promise<unknown>,
): Promise<void> {
  try {
    await task();
  } catch (error) {
    logEvent("metrics", "warn", {
      event: `${action}-failed`,
      backend: backend.kind,
      ...describeError(error),
    });
  }
}

// ─── 기록 ────────────────────────────────────────────────────

/** 서버가 세는 퍼널 단계 — 방문(visits) → 풀이 생성 → 결제 시작 → 결제(payments) */
export type FunnelCounter = "readings_created" | "checkouts_started";

/** 퍼널 카운터를 응답을 보낸 뒤에 더한다 — 예) recordMetric({ readings_created: 1 }) */
export function recordMetric(
  counters: Partial<Record<FunnelCounter, number>>,
  now: Date = new Date(),
): void {
  const backend = activeBackend();
  if (!backend) return;
  const day = utcDay(now);
  runAfterResponse(() =>
    guarded(backend, "metric", () => backend.record(day, counters as Counters)),
  );
}

/** 요청 헤더 → 방문 맥락 (Vercel이 붙이는 x-vercel-ip-country로 국가만 안다) */
export function pageViewContext(
  request: Request,
  now: Date = new Date(),
): PageViewContext {
  const { headers } = request;
  const country =
    headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  return {
    userAgent: headers.get("user-agent") ?? "",
    ip: clientIp(headers),
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    siteHost: requestHost(request).replace(/:\d+$/, ""),
    day: utcDay(now),
  };
}

/** 방문 한 건을 응답 뒤에 기록한다. 저장소가 꺼져 있으면 false */
export function recordPageView(
  payload: PageViewPayload,
  context: PageViewContext,
): boolean {
  const backend = activeBackend();
  if (!backend) return false;
  const { counters } = pageViewCounters(payload, context);
  const hash = visitorHash(context);
  runAfterResponse(() =>
    guarded(backend, "pageview", () =>
      backend.record(context.day, counters, hash),
    ),
  );
  return true;
}

export interface PaymentInput {
  checkoutSessionId: string;
  paymentIntentId: string | null;
  /** 최소 통화 단위 (USD 센트) */
  amountTotal: number;
  currency: string;
  livemode: boolean;
  country: string | null;
  /** 원장에는 해시(readingRef)로만 남는다 */
  readingId: string;
}

export type RecordPaymentResult =
  "recorded" | "duplicate" | "disabled" | "failed";

/** 결제 한 건을 원장에 남긴다 — 같은 Checkout 세션은 한 번만 (여러 번 불러도 안전) */
export async function recordPayment(
  input: PaymentInput,
  now: Date = new Date(),
): Promise<RecordPaymentResult> {
  const backend = activeBackend();
  if (!backend) return "disabled";

  const country = input.country?.trim().toUpperCase() ?? "";
  const record: PaymentRecord = {
    checkoutSessionId: input.checkoutSessionId,
    paymentIntentId: input.paymentIntentId,
    amountTotal: Math.max(0, Math.round(input.amountTotal)),
    currency: input.currency.trim().toUpperCase(),
    livemode: input.livemode,
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    readingRef: readingRefOf(input.readingId),
    recordedAt: now.toISOString(),
  };
  try {
    return await backend.appendPayment(
      record,
      utcDay(now),
      paymentCounters(record),
    );
  } catch (error) {
    logEvent("metrics", "warn", {
      event: "payment-failed",
      backend: backend.kind,
      checkoutSessionId: record.checkoutSessionId,
      ...describeError(error),
    });
    return "failed";
  }
}

/** 결제 → 그날 카운터. 테스트 결제는 따로 센다 (매출 합계에 섞지 않는다) */
export function paymentCounters(
  record: Pick<PaymentRecord, "amountTotal" | "currency" | "livemode">,
): Counters {
  const suffix = record.livemode ? "" : "_test";
  const revenueKey =
    record.currency === "USD"
      ? `revenue_cents${suffix}`
      : `revenue_minor${suffix}:${record.currency}`;
  return { [`payments${suffix}`]: 1, [revenueKey]: record.amountTotal };
}

/**
 * 풀이 ID → 원장용 참조값 (SHA-256 앞 16자). 되돌릴 수 없어 원장으로 풀이를 열 수 없지만,
 * 고객이 풀이 주소를 보내 오면 같은 값을 계산해 결제 건을 찾을 수 있다.
 */
export function readingRefOf(readingId: string): string {
  return createHash("sha256")
    .update(`kns-reading:${readingId}`)
    .digest("hex")
    .slice(0, 16);
}

/** 요청이 들어온 호스트 (Vercel·프록시 뒤에서도) */
export function requestHost(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  return (
    forwarded ||
    request.headers.get("host") ||
    new URL(request.url).host
  ).toLowerCase();
}
