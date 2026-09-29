import "server-only";

import type Stripe from "stripe";

import { sendGa4Purchase } from "@/server/analytics/ga4";
import { logEvent } from "@/server/log";
import { recordPayment } from "@/server/metrics";

/**
 * 프리미엄이 처음 열린 순간(결제당 정확히 한 번) 부르는 후속 처리.
 * - 매각 실사용 결제 원장 기록 (Stripe 세션 ID로 Stripe 대시보드와 대조할 수 있다)
 * - GA4 purchase (Measurement Protocol) — 테스트 결제는 GA 매출을 오염시키지 않도록 보내지 않는다
 *
 * 어느 쪽이 실패해도 결제·잠금 해제에는 영향이 없다.
 */
export async function onPremiumPurchased(
  session: Stripe.Checkout.Session,
  readingId: string,
): Promise<void> {
  const amountTotal = session.amount_total ?? 0;
  const currency = (session.currency ?? "usd").toUpperCase();
  const clientId = session.metadata?.ga_client_id;
  const trackTestPayments = process.env.GA4_TRACK_TEST_PAYMENTS === "1";

  const [ledger, ga4] = await Promise.allSettled([
    recordPayment({
      checkoutSessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      amountTotal,
      currency,
      livemode: session.livemode,
      country: session.customer_details?.address?.country ?? null,
      readingId,
    }),
    clientId && (session.livemode || trackTestPayments)
      ? sendGa4Purchase({
          clientId,
          sessionId: session.metadata?.ga_session_id,
          transactionId: session.id,
          value: amountTotal / 100,
          currency,
        })
      : Promise.resolve("skipped" as const),
  ]);

  logEvent("payments", "info", {
    event: "purchase-recorded",
    readingId,
    livemode: session.livemode,
    ledger: ledger.status === "fulfilled" ? ledger.value : "failed",
    ga4: ga4.status === "fulfilled" ? ga4.value : "failed",
  });
}
