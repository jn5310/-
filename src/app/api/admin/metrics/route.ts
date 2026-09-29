import { createHash, timingSafeEqual } from "node:crypto";

import { getMetricsBackend } from "@/server/metrics";
import {
  dailyCsv,
  isIsoDay,
  monthlyCsv,
  paymentsCsv,
  readMetricsReport,
  shiftDay,
} from "@/server/metrics/report";
import { describeError, logEvent } from "@/server/log";

/**
 * GET /api/admin/metrics — 매각 실사용 지표 내보내기 (운영자 전용).
 *
 *   Authorization: Bearer <METRICS_ADMIN_TOKEN>   (24자 이상, 설정하지 않으면 이 주소는 404)
 *
 *   ?type=summary   (기본) 기간 합계·전환율·유입 경로·국가·월별·일별 — JSON
 *   ?type=daily     일별 표        — json | csv
 *   ?type=monthly   월별 표        — json | csv
 *   ?type=payments  결제 원장      — json | csv (&limit=, 기본 1000 · 최대 10000)
 *   &format=csv     CSV 파일로 받기
 *   &from=YYYY-MM-DD&to=YYYY-MM-DD   UTC 날짜, 기본 최근 30일 · 최대 400일
 *
 * 예) curl -H "Authorization: Bearer %METRICS_ADMIN_TOKEN%" "https://도메인/api/admin/metrics?type=monthly&format=csv&from=2026-04-01&to=2026-09-30" -o monthly.csv
 */

export const runtime = "nodejs";

const SCOPE = "api/admin/metrics";
const MIN_TOKEN_LENGTH = 24;
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 400;
const DEFAULT_PAYMENT_LIMIT = 1_000;
const MAX_PAYMENT_LIMIT = 10_000;

const NO_STORE = { "Cache-Control": "no-store" };

type ReportType = "summary" | "daily" | "monthly" | "payments";

interface ReportQuery {
  type: ReportType;
  format: "json" | "csv";
  from: string;
  to: string;
  limit: number;
}

export async function GET(request: Request): Promise<Response> {
  const token = process.env.METRICS_ADMIN_TOKEN?.trim();
  // 토큰을 정하지 않았으면 기능이 없는 것처럼 보인다
  if (!token || token.length < MIN_TOKEN_LENGTH) {
    return new Response("Not Found", { status: 404, headers: NO_STORE });
  }
  if (!isAuthorized(request.headers.get("authorization"), token)) {
    return Response.json(
      { error: "unauthorized" },
      {
        status: 401,
        headers: { ...NO_STORE, "WWW-Authenticate": 'Bearer realm="metrics"' },
      },
    );
  }

  const query = parseQuery(new URL(request.url).searchParams);
  if ("error" in query) {
    return Response.json(
      { error: "bad-request", message: query.error },
      { status: 400, headers: NO_STORE },
    );
  }

  const backend = getMetricsBackend();
  if (!backend) {
    return Response.json(
      {
        error: "metrics-disabled",
        message:
          "No metrics store is configured (METRICS_BACKEND, Supabase or Upstash).",
      },
      { status: 503, headers: NO_STORE },
    );
  }

  try {
    if (query.type === "payments") {
      const payments = await backend.readPayments({
        limit: query.limit,
        from: query.from,
        to: query.to,
      });
      return query.format === "csv"
        ? csvResponse(paymentsCsv(payments), fileName(query))
        : Response.json(
            {
              backend: backend.kind,
              range: { from: query.from, to: query.to },
              count: payments.length,
              payments,
            },
            { headers: NO_STORE },
          );
    }

    const report = await readMetricsReport(backend, query);
    if (query.format === "csv") {
      return csvResponse(
        query.type === "monthly"
          ? monthlyCsv(report.monthly)
          : dailyCsv(report.daily),
        fileName(query),
      );
    }
    if (query.type === "daily") {
      return Response.json(
        { backend: report.backend, range: report.range, rows: report.daily },
        { headers: NO_STORE },
      );
    }
    if (query.type === "monthly") {
      return Response.json(
        { backend: report.backend, range: report.range, rows: report.monthly },
        { headers: NO_STORE },
      );
    }
    return Response.json(report, { headers: NO_STORE });
  } catch (error) {
    logEvent(SCOPE, "error", {
      event: "report-failed",
      backend: backend.kind,
      ...describeError(error),
    });
    return Response.json(
      {
        error: "metrics-unavailable",
        message: "The metrics store could not be read.",
      },
      { status: 502, headers: NO_STORE },
    );
  }
}

/** 길이가 달라도 시간 차이가 나지 않게 해시끼리 비교한다 */
function isAuthorized(header: string | null, token: string): boolean {
  const match = /^Bearer\s+(.+)$/i.exec(header?.trim() ?? "");
  if (!match) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(match[1].trim()), digest(token));
}

function parseQuery(params: URLSearchParams): ReportQuery | { error: string } {
  const type = (params.get("type") ?? "summary") as ReportType;
  if (!["summary", "daily", "monthly", "payments"].includes(type)) {
    return { error: "type must be summary, daily, monthly or payments." };
  }
  const format = params.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return { error: "format must be json or csv." };
  }
  if (format === "csv" && type === "summary") {
    return { error: "CSV is available for type=daily, monthly or payments." };
  }

  const today = new Date().toISOString().slice(0, 10);
  const to = params.get("to") ?? today;
  const from = params.get("from") ?? shiftDay(to, -(DEFAULT_RANGE_DAYS - 1));
  if (!isIsoDay(from) || !isIsoDay(to)) {
    return { error: "from and to must be UTC dates like 2026-09-29." };
  }
  if (from > to) return { error: "from must not be after to." };
  if (shiftDay(from, MAX_RANGE_DAYS - 1) < to) {
    return { error: `The range may cover at most ${MAX_RANGE_DAYS} days.` };
  }

  const limitParam = params.get("limit");
  const limit =
    limitParam === null ? DEFAULT_PAYMENT_LIMIT : Number(limitParam);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAYMENT_LIMIT) {
    return {
      error: `limit must be an integer between 1 and ${MAX_PAYMENT_LIMIT}.`,
    };
  }

  return { type, format, from, to, limit };
}

function fileName(query: ReportQuery): string {
  return `kname-studio-${query.type}-${query.from}_${query.to}.csv`;
}

function csvResponse(body: string, name: string): Response {
  return new Response(body, {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
