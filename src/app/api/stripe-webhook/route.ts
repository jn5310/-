import type Stripe from "stripe";

import { readBodyBytes } from "@/server/http";
import { describeError, logEvent } from "@/server/log";
import {
  fulfillCheckoutSession,
  type FulfillmentResult,
} from "@/server/payments/fulfillment";
import { getStripe, getWebhookSecret } from "@/server/payments/stripe";

/**
 * POST /api/stripe-webhook — Stripe 이벤트 수신 (결제 완료 → 프리미엄 잠금 해제).
 *
 * - 서명(Stripe-Signature)을 원문 바이트 그대로 검증한다. 본문을 JSON으로 먼저 읽으면 검증이 깨진다.
 * - 처리는 멱등이다. Stripe는 같은 이벤트를 여러 번 보낼 수 있고, 2xx를 받지 못하면 최대 3일간 다시 보낸다.
 *
 * 대시보드(또는 stripe listen)에서 구독할 이벤트:
 *   checkout.session.completed · checkout.session.async_payment_succeeded · checkout.session.async_payment_failed
 */

export const runtime = "nodejs";

const SCOPE = "api/stripe-webhook";
/** Stripe 이벤트는 보통 수 KB — 넉넉히 잡고 그 이상은 거부한다 */
const MAX_BODY_BYTES = 512 * 1024;

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return reply(400, "Missing Stripe-Signature header.");

  let stripe: Stripe;
  let secret: string;
  try {
    stripe = getStripe();
    secret = getWebhookSecret();
  } catch (error) {
    logEvent(SCOPE, "error", {
      event: "not-configured",
      ...describeError(error),
    });
    // 5xx면 Stripe가 다시 보낸다 — 설정을 고치면 밀린 이벤트도 처리된다
    return reply(500, "Webhook is not configured.");
  }

  let event: Stripe.Event;
  try {
    const payload = await readBodyBytes(request, MAX_BODY_BYTES);
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    logEvent(SCOPE, "warn", {
      event: "signature-verification-failed",
      ...describeError(error),
    });
    return reply(400, "Invalid payload or signature.");
  }

  try {
    await handleEvent(event);
  } catch (error) {
    logEvent(SCOPE, "error", {
      event: "handler-failed",
      eventId: event.id,
      type: event.type,
      ...describeError(error),
    });
    return reply(500, "Webhook handler failed.");
  }

  return Response.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const result = await fulfillCheckoutSession(event.data.object);
      logFulfillment(event, result);
      return;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      logEvent(SCOPE, "warn", {
        event: "async-payment-failed",
        eventId: event.id,
        sessionId: session.id,
        readingId: session.metadata?.readingId ?? null,
      });
      return;
    }
    default:
      // 구독하지 않은 이벤트는 받기만 한다 (2xx를 돌려주지 않으면 Stripe가 계속 다시 보낸다)
      return;
  }
}

function logFulfillment(event: Stripe.Event, result: FulfillmentResult) {
  const base = {
    eventId: event.id,
    type: event.type,
    livemode: event.livemode,
  };
  switch (result.status) {
    case "unlocked":
    case "pending":
      logEvent(SCOPE, "info", {
        ...base,
        event: result.status,
        readingId: result.readingId,
      });
      return;
    case "already-unlocked":
      logEvent(SCOPE, result.duplicate ? "warn" : "info", {
        ...base,
        // duplicate: 같은 풀이를 다른 결제로 또 샀다 — 대시보드에서 환불을 검토한다
        event: result.duplicate ? "duplicate-payment" : "already-unlocked",
        readingId: result.readingId,
      });
      return;
    case "reading-missing":
      // 다시 보내도 풀이는 돌아오지 않는다 — 2xx로 받고, 환불하도록 오류 로그를 남긴다
      logEvent(SCOPE, "error", {
        ...base,
        event: "paid-reading-missing",
        readingId: result.readingId,
      });
      return;
    case "ignored":
      logEvent(SCOPE, "info", {
        ...base,
        event: "ignored",
        reason: result.reason,
      });
      return;
  }
}

function reply(status: number, message: string): Response {
  return Response.json({ received: false, message }, { status });
}
