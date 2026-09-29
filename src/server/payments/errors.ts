import { StorageError } from "@/server/storage/kv";
import { NameGenerationError } from "@/server/name-generation/errors";
import type { CheckoutErrorCode } from "@/types/api";

/** 풀이 조회·결제 API의 오류 (CheckoutErrorCode가 ReadingErrorCode를 포함한다) */
export type PaymentErrorCode = CheckoutErrorCode;

interface ErrorSpec {
  status: number;
  retryable: boolean;
  /** 사용자에게 보여 줄 영문 문구 — 내부 사정(키 이름, Stripe 오류 원문)은 담지 않는다 */
  message: string;
}

export const PAYMENT_ERROR_SPECS: Record<PaymentErrorCode, ErrorSpec> = {
  INVALID_JSON: {
    status: 400,
    retryable: false,
    message: "The request body must be valid JSON.",
  },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    retryable: false,
    message: "Send the request as application/json.",
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    retryable: false,
    message: "The request is too large.",
  },
  CLIENT_CLOSED: {
    status: 499,
    retryable: true,
    message: "The request was cancelled.",
  },
  VALIDATION_ERROR: {
    status: 422,
    retryable: false,
    message: "This reading link looks incomplete.",
  },
  READING_NOT_FOUND: {
    status: 404,
    retryable: false,
    message:
      "We couldn’t find this reading. It may have expired — please create a new one.",
  },
  ALREADY_UNLOCKED: {
    status: 409,
    retryable: false,
    message: "This reading is already unlocked.",
  },
  PAYMENTS_DISABLED: {
    status: 404,
    retryable: false,
    message: "Everything is free right now — no payment is needed.",
  },
  PAYMENT_UNAVAILABLE: {
    status: 503,
    retryable: true,
    message:
      "Checkout is temporarily unavailable. You haven’t been charged — please try again.",
  },
  CONFIGURATION_ERROR: {
    status: 500,
    retryable: false,
    message: "Payments aren’t configured yet.",
  },
  INTERNAL_ERROR: {
    status: 500,
    retryable: false,
    message: "Something went wrong on our side.",
  },
};

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;

  constructor(
    code: PaymentErrorCode,
    { detail, cause }: { detail?: string; cause?: unknown } = {},
  ) {
    super(detail ?? PAYMENT_ERROR_SPECS[code].message, { cause });
    this.name = "PaymentError";
    this.code = code;
  }
}

const BODY_ERROR_CODES = new Set<PaymentErrorCode>([
  "INVALID_JSON",
  "UNSUPPORTED_MEDIA_TYPE",
  "PAYLOAD_TOO_LARGE",
  "CLIENT_CLOSED",
]);

/** 어떤 오류든 PaymentError로 바꾼다 — 요청 본문 오류·저장소 오류도 알맞은 코드로 옮긴다 */
export function toPaymentError(error: unknown): PaymentError {
  if (error instanceof PaymentError) return error;
  if (
    error instanceof NameGenerationError &&
    BODY_ERROR_CODES.has(error.code as PaymentErrorCode)
  ) {
    return new PaymentError(error.code as PaymentErrorCode, { cause: error });
  }
  if (error instanceof StorageError) {
    return new PaymentError(
      error.kind === "configuration" ? "CONFIGURATION_ERROR" : "INTERNAL_ERROR",
      { detail: error.message, cause: error },
    );
  }
  return new PaymentError("INTERNAL_ERROR", {
    detail: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}
