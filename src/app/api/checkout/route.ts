import { z } from "zod";

import { jsonResponse, readJsonBody } from "@/server/http";
import { logEvent } from "@/server/log";
import {
  createPremiumCheckout,
  resolveAppOrigin,
} from "@/server/payments/checkout";
import { PaymentError } from "@/server/payments/errors";
import { paymentFailureResponse } from "@/server/payments/respond";
import { isReadingId, loadReading } from "@/server/readings/repository";
import type { CheckoutSuccess } from "@/types/api";

/**
 * POST /api/checkout — 프리미엄 풀이($3.99 일시불) 결제 페이지 URL을 만든다.
 *
 * 요청: { readingId } · 응답: { ok: true, data: { url } } — 브라우저를 url(Stripe Checkout)로 보낸다.
 * 결제가 끝나면 Stripe가 /reading/[id]?checkout=success&session_id=…로 돌려보낸다.
 */

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1024;

const checkoutRequestSchema = z.object({ readingId: z.string() });

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const parsed = checkoutRequestSchema.safeParse(
      await readJsonBody(request, MAX_BODY_BYTES, request.signal),
    );
    if (!parsed.success || !isReadingId(parsed.data.readingId)) {
      throw new PaymentError("VALIDATION_ERROR");
    }
    const { readingId } = parsed.data;

    const loaded = await loadReading(readingId);
    if (!loaded) throw new PaymentError("READING_NOT_FOUND");
    // 이미 연 풀이는 다시 결제하지 않게 막는다
    if (loaded.entitlement) throw new PaymentError("ALREADY_UNLOCKED");

    const url = await createPremiumCheckout(
      loaded.reading,
      resolveAppOrigin(request),
    );
    logEvent("api/checkout", "info", {
      requestId,
      event: "checkout-created",
      readingId,
    });

    const body: CheckoutSuccess = {
      ok: true,
      data: { url },
      meta: { requestId },
    };
    return jsonResponse(body, 200, { "X-Request-Id": requestId });
  } catch (error) {
    return paymentFailureResponse(error, requestId, "api/checkout");
  }
}
