import { computeSajuReading } from "@/lib/saju/four-pillars";
import { analyzeSaju } from "@/lib/saju/interpretation";
import { toFieldIssues } from "@/lib/validations/field-issues";
import { sajuRequestSchema } from "@/lib/validations/saju";
import { jsonResponse, readJsonBody } from "@/server/http";
import { describeError, logEvent } from "@/server/log";
import { recordMetric } from "@/server/metrics";
import {
  ERROR_SPECS,
  NameGenerationError,
} from "@/server/name-generation/errors";
import type {
  FieldIssue,
  SajuErrorCode,
  SajuResponse,
  SajuSuccess,
} from "@/types/api";

/**
 * POST /api/saju — 사주 분석 (사주 전용 메뉴).
 *
 * 요청: { birth: { date, time | null, timeZone } } · 응답: { ok: true, data: { reading, analysis } }
 * 만세력으로 원국을 계산하고 규칙 기반 풀이(일간 성향·오행 분포·총평)를 붙인다.
 * 모델을 부르지 않아 즉시 응답하고, 생년월일시는 저장하지 않는다.
 */

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2 * 1024;

const BODY_ERROR_CODES = new Set<string>([
  "INVALID_JSON",
  "UNSUPPORTED_MEDIA_TYPE",
  "PAYLOAD_TOO_LARGE",
  "CLIENT_CLOSED",
]);

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const parsed = sajuRequestSchema.safeParse(
      await readJsonBody(request, MAX_BODY_BYTES, request.signal),
    );
    if (!parsed.success) {
      return failure(
        "VALIDATION_ERROR",
        requestId,
        toFieldIssues(parsed.error),
      );
    }

    const reading = computeSajuReading(parsed.data.birth);
    const body: SajuSuccess = {
      ok: true,
      data: { reading, analysis: analyzeSaju(reading) },
      meta: { requestId },
    };
    recordMetric({ saju_readings: 1 });
    return jsonResponse(body, 200, { "X-Request-Id": requestId });
  } catch (error) {
    if (
      error instanceof NameGenerationError &&
      BODY_ERROR_CODES.has(error.code)
    ) {
      return failure(error.code as SajuErrorCode, requestId);
    }
    logEvent("api/saju", "error", { requestId, ...describeError(error) });
    return failure("INTERNAL_ERROR", requestId);
  }
}

function failure(
  code: SajuErrorCode,
  requestId: string,
  fieldErrors?: FieldIssue[],
): Response {
  const spec = ERROR_SPECS[code];
  const body: SajuResponse = {
    ok: false,
    error: {
      code,
      message: spec.message,
      retryable: spec.retryable,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    meta: { requestId },
  };
  return jsonResponse(body, spec.status, { "X-Request-Id": requestId });
}
