import type { GenerateNameErrorCode } from "@/types/api";

interface ErrorSpec {
  status: number;
  /** 클라이언트가 잠시 뒤 같은 요청을 다시 보내도 되는지 (응답의 error.retryable) */
  retryable: boolean;
  /** 사용자에게 보여 줄 영문 문구 — 내부 사정(모델 이름, 원인)은 담지 않는다 */
  message: string;
}

export const ERROR_SPECS: Record<GenerateNameErrorCode, ErrorSpec> = {
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
  VALIDATION_ERROR: {
    status: 422,
    retryable: false,
    message: "Some details need another look.",
  },
  CONTENT_BLOCKED: {
    status: 422,
    retryable: false,
    message:
      "We couldn’t create names from these details. Please check your name and try again.",
  },
  RATE_LIMITED: {
    status: 503,
    retryable: true,
    message:
      "Our naming master is busy right now. Please try again in a moment.",
  },
  UPSTREAM_UNAVAILABLE: {
    status: 503,
    retryable: true,
    message:
      "The naming service is temporarily unavailable. Please try again shortly.",
  },
  UPSTREAM_ERROR: {
    status: 502,
    retryable: false,
    message: "The naming service returned an unexpected error.",
  },
  INVALID_MODEL_OUTPUT: {
    status: 502,
    retryable: true,
    message: "We couldn’t finish your names this time. Please try again.",
  },
  TIMEOUT: {
    status: 504,
    retryable: true,
    message: "Creating your names took too long. Please try again.",
  },
  CLIENT_CLOSED: {
    status: 499,
    retryable: true,
    message: "The request was cancelled.",
  },
  CONFIGURATION_ERROR: {
    status: 500,
    retryable: false,
    message: "The naming service isn’t configured yet.",
  },
  INTERNAL_ERROR: {
    status: 500,
    retryable: false,
    message: "Something went wrong on our side.",
  },
};

export interface NameGenerationErrorOptions {
  /** 로그용 상세 설명 (사용자에게는 보이지 않는다) */
  detail?: string;
  cause?: unknown;
  /** 모델 출력 검증에서 찾은 문제 — 재시도 프롬프트에 넣어 고치게 한다 */
  issues?: string[];
  /** 서버가 알려 준 재시도 대기 시간 (Gemini 429의 RetryInfo.retryDelay) */
  retryAfterMs?: number;
}

export class NameGenerationError extends Error {
  readonly code: GenerateNameErrorCode;
  readonly issues: string[];
  readonly retryAfterMs: number | undefined;

  constructor(
    code: GenerateNameErrorCode,
    {
      detail,
      cause,
      issues = [],
      retryAfterMs,
    }: NameGenerationErrorOptions = {},
  ) {
    super(detail ?? ERROR_SPECS[code].message, { cause });
    this.name = "NameGenerationError";
    this.code = code;
    this.issues = issues;
    this.retryAfterMs = retryAfterMs;
  }

  get status(): number {
    return ERROR_SPECS[this.code].status;
  }
}

/** 모델 출력이 형식·규칙에 맞지 않을 때 */
export function invalidModelOutput(issues: string[]): NameGenerationError {
  return new NameGenerationError("INVALID_MODEL_OUTPUT", {
    detail: `Model output rejected: ${issues.slice(0, 3).join(" / ")}`,
    issues,
  });
}

/** 중단 신호의 이유로 시간 초과와 클라이언트 연결 종료를 구분한다 */
export function abortToError(
  signal: AbortSignal,
  cause?: unknown,
): NameGenerationError {
  const reason = signal.reason as { name?: string } | undefined;
  return new NameGenerationError(
    reason?.name === "TimeoutError" ? "TIMEOUT" : "CLIENT_CLOSED",
    { cause: cause ?? signal.reason },
  );
}
