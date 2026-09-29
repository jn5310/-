import "server-only";

import { createHmac } from "node:crypto";

import { toPathGroup, type PathGroup } from "@/lib/analytics/redact";
import { logEvent } from "@/server/log";

import type { Counters } from "./types";

/*
 * 방문 한 건을 익명 카운터로 바꾼다 (쿠키·IP 저장 없음 — Plausible 방식).
 * 순 방문자: HMAC(METRICS_SALT, 날짜 | IP | User-Agent) — 날이 바뀌면 같은 사람도 다른 값이 되어 날짜를 넘겨 추적할 수 없다.
 */

type Env = Record<string, string | undefined>;

const BOT_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|undici|go-http|okhttp|java\//i;

const KNOWN_SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)naver\.com$/, "naver"],
  [/(^|\.)yahoo\./, "yahoo"],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "x"],
  [/(^|\.)facebook\.com$|^fb\.me$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)pinterest\./, "pinterest"],
  [/(^|\.)kakao\.com$/, "kakao"],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, "chatgpt"],
  [/(^|\.)perplexity\.ai$/, "perplexity"],
];

export interface PageViewPayload {
  path: string;
  /** 방문의 첫 페이지 — 이때만 방문 수와 유입 경로를 센다 */
  entry?: boolean;
  referrer?: string;
  utmSource?: string;
}

export interface PageViewContext {
  userAgent: string;
  ip: string;
  /** Vercel이 붙이는 x-vercel-ip-country */
  country: string | null;
  /** 이 사이트의 호스트 — 내부 이동을 유입 경로로 세지 않는다 */
  siteHost: string;
  day: string;
}

export function isBot(userAgent: string): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export function deviceOf(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(userAgent))
    return "tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(userAgent))
    return "mobile";
  return "desktop";
}

/** 유입 경로 — utm_source가 있으면 그것을, 없으면 참조 사이트를 묶어서 */
export function sourceOf(
  payload: Pick<PageViewPayload, "referrer" | "utmSource">,
  siteHost: string,
): string | null {
  const utm = payload.utmSource?.trim().toLowerCase();
  if (utm && /^[a-z0-9._-]{1,40}$/.test(utm)) return `utm:${utm}`;

  if (!payload.referrer) return "direct";
  let host: string;
  try {
    host = new URL(payload.referrer).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "direct";
  }
  // 같은 사이트 안에서 이동했거나 Stripe 결제에서 돌아온 것은 유입이 아니다
  if (
    host === siteHost.toLowerCase().replace(/^www\./, "") ||
    host === "stripe.com" ||
    host.endsWith(".stripe.com")
  ) {
    return null;
  }
  for (const [pattern, name] of KNOWN_SOURCES) {
    if (pattern.test(host)) return name;
  }
  return /^[a-z0-9.-]{1,60}$/.test(host) ? host : "other";
}

let warnedDefaultSalt = false;

export function visitorHash(
  context: Pick<PageViewContext, "ip" | "userAgent" | "day">,
  env: Env = process.env,
): string {
  // METRICS_SALT가 없으면 고정값을 쓴다 — 운영에서는 꼭 무작위 문자열로 지정한다 (docs/DEPLOYMENT.md).
  // 고정값이면 IP·브라우저를 아는 사람이 해시를 다시 계산해 그날 방문 여부를 맞춰 볼 수 있다.
  const configured = env.METRICS_SALT?.trim();
  if (
    !configured &&
    !warnedDefaultSalt &&
    (env.VERCEL_ENV === "production" || env.NODE_ENV === "production")
  ) {
    warnedDefaultSalt = true;
    logEvent("metrics", "warn", {
      event: "default-salt",
      message: "Set METRICS_SALT to a random secret.",
    });
  }
  const salt = configured || "kns-metrics-default-salt";
  return createHmac("sha256", salt)
    .update(`${context.day}|${context.ip}|${context.userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

/** 방문 한 건 → 카운터 */
export function pageViewCounters(
  payload: PageViewPayload,
  context: PageViewContext,
): { counters: Counters; group: PathGroup } {
  const group = toPathGroup(payload.path);
  const counters: Counters = {
    pageviews: 1,
    [`page:${group}`]: 1,
    [`device:${deviceOf(context.userAgent)}`]: 1,
  };
  if (context.country && /^[A-Z]{2}$/.test(context.country)) {
    counters[`country:${context.country}`] = 1;
  }
  if (payload.entry === true) {
    // 사이트 안에서의 새로 고침·Stripe 결제에서 돌아온 것은 새 방문이 아니다 (sourceOf → null)
    const source = sourceOf(payload, context.siteHost);
    if (source) {
      counters.visits = 1;
      counters[`source:${source}`] = 1;
    }
  }
  return { counters, group };
}

/** 요청 헤더에서 IP (Vercel: x-forwarded-for의 첫 값) */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "0.0.0.0";
}

export function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
