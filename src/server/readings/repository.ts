import "server-only";

import { randomBytes } from "node:crypto";

import { PREMIUM_OFFER } from "@/lib/pricing";
import { getKeyValueStore } from "@/server/storage/kv";
import type { GenerateNameResult } from "@/types/api";
import type {
  FreeReadingView,
  PremiumReadingView,
  ReadingView,
} from "@/types/reading";

/*
 * 이름 풀이 저장소.
 *
 * 키를 셋으로 나눠, 서로 다른 흐름이 같은 값을 덮어쓰지 않게 한다.
 * - reading:{id}      생성 결과 전체 (한 번 쓰고 바꾸지 않는다 — 결제 시 보존 기간만 늘린다)
 * - entitlement:{id}  프리미엄 권한 (웹훅·결제 복귀 확인이 "없을 때만" 기록 → 멱등)
 * - checkout:{세션ID} 이 풀이를 위해 만든 Checkout 세션 — 결제 복귀 시 세션 ID 위조를 걸러 낸다
 */

const DAY = 24 * 60 * 60;
/** 결제하지 않은 풀이 보존 기간 */
export const FREE_READING_TTL_SECONDS = 30 * DAY;
/** 결제한 풀이 보존 기간 — 증명서 PDF·도장 PNG를 받아 둘 수 있게 넉넉히 */
export const PREMIUM_READING_TTL_SECONDS = 400 * DAY;
/** Checkout 세션은 최대 24시간 열려 있다 */
const CHECKOUT_TTL_SECONDS = 2 * DAY;

// ─── ID ──────────────────────────────────────────────────────

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
const READING_ID_PATTERN = /^[a-z2-7]{26}$/;

/** 128비트 난수를 소문자 base32 26자로 — URL에 쓰기 좋고 추측할 수 없다 */
export function createReadingId(): string {
  const bytes = randomBytes(17); // 130비트 이상을 채우도록 1바이트 여유
  let bits = 0;
  let value = 0;
  let id = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && id.length < 26) {
      id += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return id;
}

export function isReadingId(value: unknown): value is string {
  return typeof value === "string" && READING_ID_PATTERN.test(value);
}

// ─── 저장 형식 ───────────────────────────────────────────────

export interface StoredReading {
  version: 1;
  id: string;
  createdAt: string;
  englishName: string;
  result: GenerateNameResult;
}

export interface Entitlement {
  version: 1;
  grantedAt: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  amountTotal: number | null;
  currency: string | null;
  livemode: boolean;
}

const readingKey = (id: string) => `reading:${id}`;
const entitlementKey = (id: string) => `entitlement:${id}`;
const checkoutKey = (sessionId: string) => `checkout:${sessionId}`;

function parseJson<T>(text: string | null): T | null {
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ─── 읽기 · 쓰기 ─────────────────────────────────────────────

export async function saveReading(input: {
  englishName: string;
  result: GenerateNameResult;
}): Promise<StoredReading> {
  const reading: StoredReading = {
    version: 1,
    id: createReadingId(),
    createdAt: new Date().toISOString(),
    englishName: input.englishName,
    result: input.result,
  };
  await getKeyValueStore().set(
    readingKey(reading.id),
    JSON.stringify(reading),
    {
      ttlSeconds: FREE_READING_TTL_SECONDS,
      ifAbsent: true,
    },
  );
  return reading;
}

export async function loadReading(
  id: string,
): Promise<{ reading: StoredReading; entitlement: Entitlement | null } | null> {
  if (!isReadingId(id)) return null;
  const store = getKeyValueStore();
  const [readingText, entitlementText] = await Promise.all([
    store.get(readingKey(id)),
    store.get(entitlementKey(id)),
  ]);
  const reading = parseJson<StoredReading>(readingText);
  if (!reading || reading.id !== id) return null;
  return { reading, entitlement: parseJson<Entitlement>(entitlementText) };
}

export type GrantOutcome =
  | { status: "granted" }
  /** 이미 열린 풀이 — existing이 다른 세션이면 중복 결제다 (환불 검토) */
  | { status: "already-granted"; existing: Entitlement | null }
  /** 결제는 됐는데 풀이가 없다 (만료·삭제) — 환불해야 한다 */
  | { status: "reading-missing" };

/**
 * 프리미엄 권한을 준다. 여러 번 불러도 결과가 같다(멱등) — 웹훅 재전송·결제 복귀 확인이 겹쳐도 안전하다.
 * 순서: 풀이 보존 기간을 먼저 늘리고 권한을 기록한다. 중간에 실패하면 5xx로 끝나 Stripe가 웹훅을 다시 보낸다.
 */
export async function grantPremium(
  id: string,
  entitlement: Omit<Entitlement, "version" | "grantedAt">,
): Promise<GrantOutcome> {
  const store = getKeyValueStore();
  const text = await store.get(readingKey(id));
  const reading = parseJson<StoredReading>(text);
  if (!text || !reading) return { status: "reading-missing" };

  await store.set(readingKey(id), text, {
    ttlSeconds: PREMIUM_READING_TTL_SECONDS,
  });
  const granted = await store.set(
    entitlementKey(id),
    JSON.stringify({
      version: 1,
      grantedAt: new Date().toISOString(),
      ...entitlement,
    } satisfies Entitlement),
    { ttlSeconds: PREMIUM_READING_TTL_SECONDS, ifAbsent: true },
  );
  if (granted) return { status: "granted" };

  return {
    status: "already-granted",
    existing: parseJson<Entitlement>(await store.get(entitlementKey(id))),
  };
}

export async function rememberCheckoutSession(
  sessionId: string,
  readingId: string,
): Promise<void> {
  await getKeyValueStore().set(checkoutKey(sessionId), readingId, {
    ttlSeconds: CHECKOUT_TTL_SECONDS,
  });
}

/** 이 서버가 만든 Checkout 세션이면 그 풀이 ID를, 아니면 null을 돌려준다 */
export async function getCheckoutSessionReadingId(
  sessionId: string,
): Promise<string | null> {
  return getKeyValueStore().get(checkoutKey(sessionId));
}

// ─── 화면용 뷰 ───────────────────────────────────────────────

export function toFreeView(
  reading: StoredReading,
  options: { payment?: "processing" } = {},
): FreeReadingView {
  const [first] = reading.result.names;
  return {
    tier: "free",
    readingId: reading.id,
    englishName: reading.englishName,
    createdAt: reading.createdAt,
    // 무료로는 이름 1개의 한글·영문 발음·한 줄 의미만 — 한자·오행·풀이는 보내지 않는다
    name: {
      hangul: first.hangul,
      romanization: first.romanization,
      summary: first.summary,
    },
    lockedNameCount: Math.max(0, reading.result.names.length - 1),
    offer: PREMIUM_OFFER,
    ...(options.payment ? { payment: options.payment } : {}),
  };
}

export function toPremiumView(
  reading: StoredReading,
  entitlement: Entitlement,
): PremiumReadingView {
  return {
    tier: "premium",
    readingId: reading.id,
    englishName: reading.englishName,
    createdAt: reading.createdAt,
    unlockedAt: entitlement.grantedAt,
    result: reading.result,
  };
}

export function toReadingView(
  reading: StoredReading,
  entitlement: Entitlement | null,
): ReadingView {
  return entitlement
    ? toPremiumView(reading, entitlement)
    : toFreeView(reading);
}
