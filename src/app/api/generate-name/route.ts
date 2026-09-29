import type { ZodError } from "zod";

import { nameRequestSchema } from "@/lib/validations/name-request";
import { createTimeoutSignal } from "@/server/deadline";
import { jsonResponse, readJsonBody } from "@/server/http";
import {
  ERROR_SPECS,
  NameGenerationError,
} from "@/server/name-generation/errors";
import {
  createGeminiModel,
  readGeminiConfig,
} from "@/server/name-generation/gemini";
import {
  generateNames,
  type AttemptRecord,
} from "@/server/name-generation/generate-names";
import type {
  FieldIssue,
  GenerateNameFailure,
  GenerateNameSuccess,
} from "@/types/api";
import type { NameRequest } from "@/types/name";

/**
 * POST /api/generate-name
 *
 * 요청: NameRequest (application/json) — 입력 폼의 제출 값
 * 응답: GenerateNameResponse — { ok: true, data, meta } | { ok: false, error, meta }
 */

// @google/genai는 Node.js 런타임에서 실행한다
export const runtime = "nodejs";
// LLM 응답(사고 포함 10–30초)과 재시도를 감안한 함수 최대 실행 시간(초) — 호스팅 요금제 한도 안에서 조정
export const maxDuration = 60;

const MAX_BODY_BYTES = 8 * 1024;
/** 서버가 대기 시간을 알려 주지 않았을 때 클라이언트에 권할 재시도 간격(초) */
const DEFAULT_RETRY_AFTER_SECONDS = 15;

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const attempts: AttemptRecord[] = [];
  let disposeDeadline = () => {};

  try {
    const config = readGeminiConfig();
    // 제한 시간은 본문을 읽기 전부터 잰다 — 느린 업로드도 같은 시간 안에서 끊는다
    const deadline = createTimeoutSignal(config.timeoutMs);
    disposeDeadline = deadline.dispose;
    // 전체 제한 시간과 클라이언트 연결 종료 중 먼저 오는 쪽에서 요청을 끊는다
    const signal = AbortSignal.any([request.signal, deadline.signal]);

    const parsed = nameRequestSchema.safeParse(
      await readJsonBody(request, MAX_BODY_BYTES, signal),
    );
    if (!parsed.success) {
      return failure(
        new NameGenerationError("VALIDATION_ERROR"),
        requestId,
        attempts,
        toFieldIssues(parsed.error),
      );
    }
    // 검증 결과가 도메인 요청 타입과 같은 모양인지 컴파일 단계에서 확인한다
    const nameRequest: NameRequest = parsed.data;

    const outcome = await generateNames(
      nameRequest,
      createGeminiModel(config),
      {
        signal,
        deadline: startedAt + config.timeoutMs,
        onAttempt: (record) => attempts.push(record),
      },
    );

    const body: GenerateNameSuccess = {
      ok: true,
      // 프리미엄 분석(premium)은 결제·인증 연동 전까지 모든 응답에 포함한다.
      // 연동 후에는 여기서 권한을 확인해 premium을 null로 바꿔 보내야 한다.
      data: outcome.result,
      meta: {
        requestId,
        model: outcome.model,
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        attempts: outcome.attempts,
      },
    };
    log("info", {
      requestId,
      status: 200,
      model: outcome.model,
      durationMs: body.meta.durationMs,
      attempts,
    });
    return jsonResponse(body, 200, { "X-Request-Id": requestId });
  } catch (error) {
    const known =
      error instanceof NameGenerationError
        ? error
        : new NameGenerationError("INTERNAL_ERROR", { cause: error });
    return failure(known, requestId, attempts);
  } finally {
    disposeDeadline();
  }
}

function failure(
  error: NameGenerationError,
  requestId: string,
  attempts: AttemptRecord[],
  fieldErrors?: FieldIssue[],
): Response {
  const spec = ERROR_SPECS[error.code];
  if (spec.status >= 500 || error.code === "CONTENT_BLOCKED") {
    const cause =
      error.cause instanceof Error ? error.cause.message : error.cause;
    log("error", {
      requestId,
      status: spec.status,
      code: error.code,
      detail: error.message,
      issues: error.issues.slice(0, 5),
      cause: typeof cause === "string" ? cause.slice(0, 500) : undefined,
      attempts,
    });
  }

  const body: GenerateNameFailure = {
    ok: false,
    error: {
      code: error.code,
      message: spec.message,
      retryable: spec.retryable,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    meta: { requestId },
  };
  const headers: Record<string, string> = { "X-Request-Id": requestId };
  if (spec.status === 503) {
    const seconds = error.retryAfterMs
      ? Math.ceil(error.retryAfterMs / 1000)
      : DEFAULT_RETRY_AFTER_SECONDS;
    headers["Retry-After"] = String(seconds);
  }
  return jsonResponse(body, spec.status, headers);
}

/**
 * 경로마다 첫 번째 오류만 돌려준다. 경로는 요청 본문(NameRequest) 기준이다.
 * 입력 폼에 붙일 때는 surname.id → surname.choice, surname.value → surname.custom으로 바꾼다.
 */
function toFieldIssues(error: ZodError): FieldIssue[] {
  const seen = new Set<string>();
  const issues: FieldIssue[] = [];
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (seen.has(path)) continue;
    seen.add(path);
    issues.push({ path, message: issue.message });
  }
  return issues;
}

/** 운영 로그(JSON 한 줄) — 생년월일 같은 개인 정보는 남기지 않는다 */
function log(level: "info" | "error", entry: Record<string, unknown>) {
  const line = JSON.stringify({ scope: "api/generate-name", ...entry });
  if (level === "error") console.error(line);
  else console.info(line);
}
