import "server-only";

import type Stripe from "stripe";

import { PREMIUM_OFFER } from "@/lib/pricing";
import { rememberCheckoutSession } from "@/server/readings/repository";
import type { StoredReading } from "@/server/readings/repository";

import { PaymentError } from "./errors";
import { PREMIUM_PRODUCT_KEY } from "./fulfillment";
import { getStripe, getStripeProductId, toStripeFailure } from "./stripe";

/**
 * 결제 후 돌아올 사이트 주소.
 * 운영에서는 APP_URL(예: https://kname.studio)을 지정한다 — 프록시 뒤에서는 요청 URL의 호스트가 내부 주소일 수 있다.
 */
export function resolveAppOrigin(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.APP_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.origin;
      }
    } catch {
      // 아래에서 설정 오류로 알린다
    }
    throw new PaymentError("CONFIGURATION_ERROR", {
      detail: "APP_URL must be an absolute http(s) URL.",
    });
  }
  return new URL(request.url).origin;
}

/** $3.99 일시불 Checkout 세션을 만들고 결제 페이지 URL을 돌려준다 */
export async function createPremiumCheckout(
  reading: StoredReading,
  origin: string,
  analytics: { clientId?: string; sessionId?: string } = {},
): Promise<string> {
  const stripe = getStripe();
  const productId = getStripeProductId();
  const readingUrl = `${origin}/reading/${reading.id}`;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: PREMIUM_OFFER.currency,
          unit_amount: PREMIUM_OFFER.amount,
          // 대시보드 상품이 있으면 그 상품으로, 없으면 즉석 상품으로 청구한다 (금액은 항상 코드의 PREMIUM_OFFER)
          ...(productId
            ? { product: productId }
            : {
                product_data: {
                  name: "K-Name Studio · Premium name reading",
                  description:
                    "All 3 Saju-based Korean names, full Saju & Hanja analysis, Korean seal PNG and name certificate PDF.",
                },
              }),
        },
      },
    ],
    // {CHECKOUT_SESSION_ID}는 Stripe가 채우는 자리표시자다 — URL 인코딩하면 치환되지 않으므로 문자열로 붙인다
    success_url: `${readingUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${readingUrl}?checkout=cancelled`,
    client_reference_id: reading.id,
    metadata: {
      product: PREMIUM_PRODUCT_KEY,
      readingId: reading.id,
      // 웹훅이 GA4로 purchase를 보낼 때 같은 사용자·세션으로 묶는다
      ...(analytics.clientId ? { ga_client_id: analytics.clientId } : {}),
      ...(analytics.sessionId ? { ga_session_id: analytics.sessionId } : {}),
    },
    payment_intent_data: {
      // 이름·생년월일 같은 풀이 내용은 Stripe로 보내지 않는다 — 풀이 ID로만 연결한다
      description: "K-Name Studio premium reading",
      metadata: { product: PREMIUM_PRODUCT_KEY, readingId: reading.id },
    },
    submit_type: "pay",
  };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (error) {
    throw toStripeFailure(error);
  }
  if (!session.url) {
    throw new PaymentError("PAYMENT_UNAVAILABLE", {
      detail: `Checkout session ${session.id} has no URL.`,
    });
  }

  await rememberCheckoutSession(session.id, reading.id);
  return session.url;
}
