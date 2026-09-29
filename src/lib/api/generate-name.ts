import type {
  FieldIssue,
  GenerateNameFailure,
  GenerateNameResponse,
} from "@/types/api";
import type { NameRequest } from "@/types/name";

/*
 * 브라우저에서 POST /api/generate-name을 부르는 클라이언트.
 * 어떤 경우에도 GenerateNameResponse 모양으로 돌려주므로, 화면은 ok 값만 보고 분기하면 된다.
 */

export const GENERATE_NAME_ENDPOINT = "/api/generate-name";

/** 서버 제한 시간(최대 55초) + 네트워크 여유 — 호스팅 게이트웨이가 응답 없이 끊는 경우를 대비한다 */
const CLIENT_TIMEOUT_MS = 65_000;

export async function requestGeneratedNames(
  request: NameRequest,
  signal?: AbortSignal,
): Promise<GenerateNameResponse> {
  const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(GENERATE_NAME_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: combined,
    });
  } catch (error) {
    // 사용자가 취소한 경우는 호출한 쪽이 조용히 무시할 수 있도록 그대로 던진다
    if (signal?.aborted) throw error;
    return timeout.aborted
      ? clientFailure(
          "TIMEOUT",
          "Creating your names took too long. Please try again.",
          true,
        )
      : clientFailure(
          "UPSTREAM_UNAVAILABLE",
          "We couldn’t reach the naming service. Check your connection and try again.",
          true,
        );
  }

  try {
    const body = (await response.json()) as GenerateNameResponse;
    if (body && typeof body === "object" && "ok" in body) return body;
  } catch {
    // 호스팅 게이트웨이가 HTML 오류 페이지를 돌려준 경우 등 — 아래에서 상태 코드로 판단한다
  }

  return response.status === 504
    ? clientFailure(
        "TIMEOUT",
        "Creating your names took too long. Please try again.",
        true,
      )
    : clientFailure(
        "INTERNAL_ERROR",
        `The naming service returned an unexpected response (HTTP ${response.status}).`,
        response.status >= 500,
      );
}

function clientFailure(
  code: GenerateNameFailure["error"]["code"],
  message: string,
  retryable: boolean,
): GenerateNameFailure {
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
