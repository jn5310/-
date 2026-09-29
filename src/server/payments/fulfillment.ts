import "server-only";

import type Stripe from "stripe";

import {
  getCheckoutSessionReadingId,
  grantPremium,
  isReadingId,
} from "@/server/readings/repository";

import { getStripe, isCheckoutSessionId, toStripeFailure } from "./stripe";

/** Checkout 세션 metadata.product — 같은 Stripe 계정의 다른 결제와 구분한다 */
export const PREMIUM_PRODUCT_KEY = "premium_reading";

export type FulfillmentResult =
  | { status: "unlocked"; readingId: string }
  | { status: "already-unlocked"; readingId: string; duplicate: boolean }
  /** 결제 절차는 끝났지만 돈이 아직 들어오지 않음 (계좌이체 등 지연 결제) — async_payment_succeeded를 기다린다 */
  | { status: "pending"; readingId: string }
  | { status: "reading-missing"; readingId: string }
  | { status: "ignored"; reason: string };

/**
 * 결제 완료된 Checkout 세션으로 프리미엄을 연다 — 멱등이다.
 * 웹훅(checkout.session.completed · async_payment_succeeded)과 결제 복귀 확인이 같은 함수를 쓴다
 * (Stripe 권장 방식: 웹훅이 늦게 와도 사용자는 돌아오자마자 결과를 본다).
 */
export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfillmentResult> {
  if (session.metadata?.product !== PREMIUM_PRODUCT_KEY) {
    return { status: "ignored", reason: "not-a-premium-reading-session" };
  }
  const readingId = session.metadata?.readingId ?? session.client_reference_id;
  if (!isReadingId(readingId)) {
    return { status: "ignored", reason: "invalid-reading-id" };
  }
  if (session.mode !== "payment") {
    return { status: "ignored", reason: `unexpected-mode:${session.mode}` };
  }
  // 100% 할인 코드로 0원이 되면 no_payment_required — 이것도 구매 완료다
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return { status: "pending", readingId };
  }

  const outcome = await grantPremium(readingId, {
    checkoutSessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    amountTotal: session.amount_total,
    currency: session.currency,
    livemode: session.livemode,
  });

  switch (outcome.status) {
    case "granted":
      return { status: "unlocked", readingId };
    case "already-granted":
      return {
        status: "already-unlocked",
        readingId,
        // 다른 세션으로 이미 열렸다면 같은 풀이를 두 번 결제한 것 — 운영자가 환불을 검토한다
        duplicate:
          outcome.existing !== null &&
          outcome.existing.checkoutSessionId !== session.id,
      };
    case "reading-missing":
      return { status: "reading-missing", readingId };
  }
}

/**
 * 결제를 마치고 success_url로 돌아왔을 때: URL의 session_id를 Stripe에서 직접 확인해 연다.
 * 이 풀이를 위해 이 서버가 만든 세션만 조회한다 — 아무 세션 ID로 Stripe API를 두드리는 것을 막는다.
 */
export async function confirmCheckoutReturn(
  readingId: string,
  sessionId: string,
): Promise<FulfillmentResult> {
  if (!isCheckoutSessionId(sessionId)) {
    return { status: "ignored", reason: "invalid-session-id" };
  }
  if ((await getCheckoutSessionReadingId(sessionId)) !== readingId) {
    return { status: "ignored", reason: "unknown-session" };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    throw toStripeFailure(error);
  }
  // 다른 풀이의 결제 세션으로 이 풀이를 열 수 없다
  if (
    (session.metadata?.readingId ?? session.client_reference_id) !== readingId
  ) {
    return { status: "ignored", reason: "reading-mismatch" };
  }
  return fulfillCheckoutSession(session);
}
