import "server-only";

import { jsonResponse } from "@/server/http";
import { describeError, logEvent } from "@/server/log";
import type { ApiFailure } from "@/types/api";

import {
  PAYMENT_ERROR_SPECS,
  toPaymentError,
  type PaymentErrorCode,
} from "./errors";

/** 풀이 조회·결제 API의 실패 응답 — 5xx는 원인을 로그에 남기고, 사용자에게는 정해 둔 문구만 보낸다 */
export function paymentFailureResponse(
  error: unknown,
  requestId: string,
  scope: string,
): Response {
  const failure = toPaymentError(error);
  const spec = PAYMENT_ERROR_SPECS[failure.code];
  if (spec.status >= 500) {
    logEvent(scope, "error", {
      requestId,
      status: spec.status,
      code: failure.code,
      ...describeError(failure),
    });
  }

  const body: ApiFailure<PaymentErrorCode> = {
    ok: false,
    error: {
      code: failure.code,
      message: spec.message,
      retryable: spec.retryable,
    },
    meta: { requestId },
  };
  const headers: Record<string, string> = { "X-Request-Id": requestId };
  if (spec.status === 503) headers["Retry-After"] = "5";
  return jsonResponse(body, spec.status, headers);
}
