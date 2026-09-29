import "server-only";

/*
 * GA4 Measurement Protocol — 결제 완료(purchase)를 서버가 직접 보낸다.
 *
 * 브라우저에서만 보내면 광고 차단기, 결제 후 탭 닫기, 결제 수단 확정 지연(웹훅으로만 확정) 때문에 빠진다.
 * 결제 버튼을 누를 때 브라우저의 GA client_id·session_id를 Checkout 세션 metadata에 실어 두고,
 * 웹훅에서 같은 사용자·세션으로 purchase를 보낸다. transaction_id는 Stripe Checkout 세션 ID다.
 *
 * 필요한 값: NEXT_PUBLIC_GA_MEASUREMENT_ID + GA4_API_SECRET
 * (GA4 관리 › 데이터 스트림 › 웹 스트림 › Measurement Protocol API 비밀 번호)
 */

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,16}$/;
const CLIENT_ID_PATTERN = /^\d{1,20}\.\d{1,20}$/;
const SESSION_ID_PATTERN = /^\d{1,20}$/;
const DEFAULT_ENDPOINT = "https://www.google-analytics.com/mp/collect";
const TIMEOUT_MS = 3_000;

type Env = Record<string, string | undefined>;

export interface Ga4ServerConfig {
  measurementId: string;
  apiSecret: string;
  endpoint: string;
}

export function readGa4ServerConfig(
  env: Env = process.env,
): Ga4ServerConfig | null {
  const measurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim().toUpperCase();
  const apiSecret = env.GA4_API_SECRET?.trim();
  if (
    !measurementId ||
    !MEASUREMENT_ID_PATTERN.test(measurementId) ||
    !apiSecret
  ) {
    return null;
  }
  // EU 데이터 수집 엔드포인트를 쓰려면 GA4_MP_ENDPOINT=https://region1.google-analytics.com/mp/collect
  const endpoint = env.GA4_MP_ENDPOINT?.trim() || DEFAULT_ENDPOINT;
  return { measurementId, apiSecret, endpoint };
}

/** 브라우저가 보낸 GA 식별자 검증 — 형식이 다르면 버린다 */
export function sanitizeGaIdentifiers(input: {
  clientId?: unknown;
  sessionId?: unknown;
}): { clientId?: string; sessionId?: string } {
  const clientId =
    typeof input.clientId === "string" && CLIENT_ID_PATTERN.test(input.clientId)
      ? input.clientId
      : undefined;
  const sessionId =
    typeof input.sessionId === "string" &&
    SESSION_ID_PATTERN.test(input.sessionId)
      ? input.sessionId
      : undefined;
  return {
    ...(clientId ? { clientId } : {}),
    ...(sessionId ? { sessionId } : {}),
  };
}

export interface Ga4Purchase {
  clientId: string;
  sessionId?: string;
  /** Stripe Checkout 세션 ID — GA가 같은 거래를 두 번 세지 않는 기준 */
  transactionId: string;
  value: number;
  currency: string;
}

export function buildPurchasePayload(purchase: Ga4Purchase) {
  return {
    client_id: purchase.clientId,
    // 광고 개인화 동의 여부를 서버는 모른다 — 보수적으로 거부로 보낸다 (분석 집계에는 영향 없음)
    consent: { ad_user_data: "DENIED", ad_personalization: "DENIED" },
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: purchase.transactionId,
          value: purchase.value,
          currency: purchase.currency,
          items: [
            {
              item_id: "premium_reading",
              item_name: "Premium name reading",
              price: purchase.value,
              quantity: 1,
            },
          ],
          ...(purchase.sessionId ? { session_id: purchase.sessionId } : {}),
          // 참여 시간이 있어야 실시간·활성 사용자 보고서에 잡힌다
          engagement_time_msec: 1,
        },
      },
    ],
  };
}

export type Ga4SendResult = "sent" | "skipped" | "failed";

/** 실패해도 결제 처리에는 영향을 주지 않는다 — 결과만 돌려준다 */
export async function sendGa4Purchase(
  purchase: Ga4Purchase,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: Env; fetchImpl?: typeof fetch } = {},
): Promise<Ga4SendResult> {
  const config = readGa4ServerConfig(env);
  if (!config) return "skipped";

  const url =
    `${config.endpoint}?measurement_id=${encodeURIComponent(config.measurementId)}` +
    `&api_secret=${encodeURIComponent(config.apiSecret)}`;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPurchasePayload(purchase)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
