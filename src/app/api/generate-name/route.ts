import { toFieldIssues } from "@/lib/validations/field-issues";
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
import { recordMetric } from "@/server/metrics";
import { saveReading, toReadingView } from "@/server/readings/repository";
import { getKeyValueStore, StorageError } from "@/server/storage/kv";
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
 *
 * 생성 결과 전체는 서버에 풀이(reading)로 저장한다. 페이월이 꺼져 있으면(기본, 무료 개방) 응답에 전체 풀이를,
 * 켜져 있으면 무료 미리보기(이름 1개)만 담고 나머지 이름·상세 분석은 결제 후 GET /api/readings/:id로 받는다.
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
    // 결과를 저장할 곳이 없으면 모델을 부르기 전에 멈춘다 (비용이 드는 호출을 낭비하지 않게)
    getKeyValueStore();
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

    const reading = await saveReading({
      englishName: nameRequest.englishName,
      result: outcome.result,
    });
    // 퍼널 2단계(풀이 생성) — 응답을 보낸 뒤에 기록한다
    recordMetric({ readings_created: 1 });

    const body: GenerateNameSuccess = {
      ok: true,
      // 페이월이 켜져 있으면 무료 미리보기만 보낸다 — 프리미엄 데이터는 결제 확인 뒤 /api/readings/:id에서만 나간다.
      // 꺼져 있으면(무료 개방) 전체 풀이를 보낸다
      data: toReadingView(reading, null),
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
      readingId: reading.id,
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
        : error instanceof StorageError
          ? new NameGenerationError(
              error.kind === "configuration"
                ? "CONFIGURATION_ERROR"
                : "INTERNAL_ERROR",
              { detail: error.message, cause: error },
            )
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

/** 운영 로그(JSON 한 줄) — 생년월일 같은 개인 정보는 남기지 않는다 */
function log(level: "info" | "error", entry: Record<string, unknown>) {
  const line = JSON.stringify({ scope: "api/generate-name", ...entry });
  if (level === "error") console.error(line);
  else console.info(line);
}
