import type {
  ApiFailure,
  CheckoutErrorCode,
  CheckoutRequest,
  CheckoutResponse,
  FieldIssue,
  GenerateNameResponse,
  ReadingResponse,
} from "@/types/api";
import type { NameRequest } from "@/types/name";

/*
 * 브라우저에서 API를 부르는 클라이언트.
 * 네트워크 오류·시간 초과·HTML 오류 페이지도 ApiFailure 모양으로 바꿔 돌려주므로, 화면은 ok 값만 보고 분기하면 된다.
 * 호출한 쪽이 signal로 취소한 경우에만 예외(AbortError)를 던진다.
 */

/** 서버가 아니라 브라우저가 만든 실패 */
export type ClientErrorCode = "NETWORK_ERROR" | "TIMEOUT" | "BAD_RESPONSE";

/** 응답 유니온에서 실패 코드만 뽑는다 */
type FailureCode<R> = R extends ApiFailure<infer Code> ? Code : never;

/** 서버 응답 유니온 + 브라우저가 만든 실패 */
export type ClientResult<R> =
  Extract<R, { ok: true }> | ApiFailure<FailureCode<R> | ClientErrorCode>;

/** 이름 생성: 서버 제한 시간(최대 55초) + 여유 */
const GENERATE_TIMEOUT_MS = 65_000;
const DEFAULT_TIMEOUT_MS = 20_000;

export function requestGeneratedNames(
  request: NameRequest,
  signal?: AbortSignal,
): Promise<ClientResult<GenerateNameResponse>> {
  return callApi<GenerateNameResponse>("/api/generate-name", {
    method: "POST",
    body: request,
    signal,
    timeoutMs: GENERATE_TIMEOUT_MS,
  });
}

export function requestCheckout(
  readingId: string,
  {
    analytics,
    signal,
  }: { analytics?: CheckoutRequest["analytics"]; signal?: AbortSignal } = {},
): Promise<ClientResult<CheckoutResponse>> {
  return callApi<CheckoutResponse>("/api/checkout", {
    method: "POST",
    body: {
      readingId,
      ...(analytics && (analytics.clientId || analytics.sessionId)
        ? { analytics }
        : {}),
    } satisfies CheckoutRequest,
    signal,
  });
}

export function fetchReading(
  readingId: string,
  {
    sessionId,
    signal,
  }: { sessionId?: string | null; signal?: AbortSignal } = {},
): Promise<ClientResult<ReadingResponse>> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  return callApi<ReadingResponse>(
    `/api/readings/${encodeURIComponent(readingId)}${query}`,
    { method: "GET", signal },
  );
}

export type CheckoutFailureCode = CheckoutErrorCode | ClientErrorCode;

async function callApi<R>(
  url: string,
  {
    method,
    body,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: {
    method: "GET" | "POST";
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<ClientResult<R>> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? anySignal([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: combined,
    });
  } catch (error) {
    // 사용자가 취소한 경우는 호출한 쪽이 조용히 무시할 수 있도록 그대로 던진다
    if (signal?.aborted) throw error;
    return timeout.aborted
      ? clientFailure("TIMEOUT", "This is taking too long. Please try again.")
      : clientFailure(
          "NETWORK_ERROR",
          "We couldn’t reach the server. Check your connection and try again.",
        );
  }

  try {
    const parsed = (await response.json()) as ClientResult<R>;
    if (parsed && typeof parsed === "object" && "ok" in parsed) return parsed;
  } catch {
    // 호스팅 게이트웨이가 HTML 오류 페이지를 돌려준 경우 등 — 아래에서 상태 코드로 판단한다
  }

  return response.status === 504
    ? clientFailure("TIMEOUT", "This is taking too long. Please try again.")
    : clientFailure(
        "BAD_RESPONSE",
        `The server returned an unexpected response (HTTP ${response.status}).`,
        response.status >= 500,
      );
}

/** AbortSignal.any가 없는 오래된 브라우저를 위한 대체 구현 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const each of signals) {
    if (each.aborted) {
      controller.abort(each.reason);
      break;
    }
    each.addEventListener("abort", () => controller.abort(each.reason), {
      once: true,
    });
  }
  return controller.signal;
}

function clientFailure(
  code: ClientErrorCode,
  message: string,
  retryable = true,
): ApiFailure<ClientErrorCode> {
  return {
    ok: false,
    error: { code, message, retryable },
    meta: { requestId: "client" },
  };
}

/**
 * API의 fieldErrors 경로(요청 본문 기준)를 입력 폼 필드 경로로 바꾼다.
 * surname.id → surname.choice, surname.value → surname.custom, surname(판별 실패) → surname.choice.
 */
export function toFormFieldPath(path: FieldIssue["path"]): string {
  if (path === "surname" || path === "surname.id" || path === "surname.source")
    return "surname.choice";
  if (path === "surname.value") return "surname.custom";
  return path;
}
