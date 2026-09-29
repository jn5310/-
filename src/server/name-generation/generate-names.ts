import { computeSajuReading } from "@/lib/saju/four-pillars";
import { countSelectedSurnameSyllables } from "@/lib/validations/rules";
import type { GenerateNameErrorCode, GenerateNameResult } from "@/types/api";
import type { NameRequest } from "@/types/name";

import {
  abortToError,
  invalidModelOutput,
  NameGenerationError,
} from "./errors";
import { MODEL_OUTPUT_JSON_SCHEMA } from "./output-schema";
import { parseModelOutput, type NamingContext } from "./parse-output";
import { buildNamingPrompt, SYSTEM_INSTRUCTION } from "./prompt";

export interface ModelUsage {
  promptTokens: number;
  outputTokens: number;
  /** 사고(thinking)에 쓴 토큰 — 출력 한도에 함께 포함된다 */
  thoughtsTokens: number;
}

/** LLM 호출을 추상화한다 — 운영은 gemini.ts, 테스트는 가짜 구현을 쓴다 */
export interface NameModel {
  readonly model: string;
  generate(request: {
    systemInstruction: string;
    prompt: string;
    responseJsonSchema: unknown;
    signal: AbortSignal;
  }): Promise<{
    text: string | undefined;
    finishReason?: string;
    blockReason?: string;
    modelVersion?: string;
    usage?: ModelUsage;
  }>;
}

/** 시도 한 번의 기록 — 운영 로그용 (개인 정보 없음) */
export interface AttemptRecord {
  attempt: number;
  durationMs: number;
  /** 성공이면 "OK", 실패면 오류 코드 */
  outcome: "OK" | GenerateNameErrorCode;
  finishReason?: string;
  /** 출력 검증에서 찾은 문제 수 */
  issueCount: number;
  usage?: ModelUsage;
}

export interface GenerateNamesOptions {
  /** 전체 제한 시간 + 클라이언트 연결 종료 */
  signal: AbortSignal;
  /** 이 시각(ms)까지 끝내야 한다 — 남은 시간이 부족하면 재시도하지 않는다 */
  deadline: number;
  /** 시도마다 호출된다 — 첫 시도 실패율·토큰 사용량을 모니터링하는 데 쓴다 */
  onAttempt?: (record: AttemptRecord) => void;
  now?: () => number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

export interface NameGenerationOutcome {
  result: GenerateNameResult;
  /** 실제로 응답한 모델 버전 */
  model: string;
  attempts: number;
}

export const MAX_ATTEMPTS = 3;
/**
 * 새 시도를 시작하려면 이만큼은 남아 있어야 한다. 한 번 호출에 보통 10–25초가 걸리므로,
 * 이보다 적게 남았을 때 시작하면 대부분 끝내지 못하고 504로 끝난다 — 그럴 바엔 손에 쥔 오류를 바로 돌려준다.
 */
const MIN_ATTEMPT_BUDGET_MS = 20_000;
const RETRY_BASE_DELAY_MS = 700;

/** 다시 시도하면 나아질 수 있는 실패 */
const RETRYABLE: ReadonlySet<GenerateNameErrorCode> = new Set([
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "INVALID_MODEL_OUTPUT",
]);

/** 안전 정책으로 막힌 종료 사유 — 같은 입력으로는 다시 해도 막힌다 */
const BLOCKED_FINISH_REASONS = new Set([
  "SAFETY",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
]);

/**
 * 사주 원국 계산 → 프롬프트 → 모델 호출 → JSON 파싱·검증을 묶는다.
 *
 * - 출력이 규칙을 어기면 무엇이 틀렸는지 프롬프트에 붙여 다시 요청한다(최대 3회).
 * - 429·5xx·네트워크 오류는 쉬었다가 다시 시도한다 (429는 Gemini가 알려 준 대기 시간을 따른다).
 * - 모든 시도는 options.deadline 안에서만 한다.
 */
export async function generateNames(
  request: NameRequest,
  model: NameModel,
  options: GenerateNamesOptions,
): Promise<NameGenerationOutcome> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? abortableSleep;
  const saju = computeSajuReading(request.birth);
  const context = toNamingContext(request);
  const surnameSyllables = context.surnameSyllables;

  let issues: string[] = [];
  let lastError: NameGenerationError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (lastError) {
      const backoff = RETRY_BASE_DELAY_MS * 2 ** (attempt - 2);
      const delay = Math.max(backoff, lastError.retryAfterMs ?? 0);
      if (options.deadline - now() - delay < MIN_ATTEMPT_BUDGET_MS) break;
      await sleep(delay, options.signal);
    }

    const startedAt = now();
    let response: Awaited<ReturnType<NameModel["generate"]>> | undefined;
    try {
      response = await raceWithAbort(
        model.generate({
          systemInstruction: SYSTEM_INSTRUCTION,
          prompt: buildNamingPrompt(
            { request, saju, surnameSyllables },
            issues,
          ),
          responseJsonSchema: MODEL_OUTPUT_JSON_SCHEMA,
          signal: options.signal,
        }),
        options.signal,
      );

      if (response.blockReason) {
        throw new NameGenerationError("CONTENT_BLOCKED", {
          detail: `Prompt blocked: ${response.blockReason}`,
        });
      }
      if (BLOCKED_FINISH_REASONS.has(response.finishReason ?? "")) {
        throw new NameGenerationError("CONTENT_BLOCKED", {
          detail: `Response blocked: ${response.finishReason}`,
        });
      }
      if (response.finishReason === "MAX_TOKENS") {
        throw invalidModelOutput([
          "응답이 출력 한도에서 잘려 JSON이 끝나지 않았습니다. 분량 지침 안에서 JSON을 끝까지 완성하세요.",
        ]);
      }

      const parsed = parseModelOutput(response.text, context);
      options.onAttempt?.({
        attempt,
        durationMs: now() - startedAt,
        outcome: "OK",
        finishReason: response.finishReason,
        issueCount: 0,
        usage: response.usage,
      });
      return {
        result: { ...parsed, saju },
        model: response.modelVersion ?? model.model,
        attempts: attempt,
      };
    } catch (error) {
      const failure = toGenerationError(error, options.signal);
      options.onAttempt?.({
        attempt,
        durationMs: now() - startedAt,
        outcome: failure.code,
        finishReason: response?.finishReason,
        issueCount: failure.issues.length,
        usage: response?.usage,
      });
      if (!RETRYABLE.has(failure.code) || options.signal.aborted) throw failure;
      lastError = failure;
      // 429·5xx가 끼어들어도 앞서 찾은 출력 문제는 다음 시도까지 이어서 알려 준다
      if (failure.code === "INVALID_MODEL_OUTPUT") issues = failure.issues;
    }
  }

  throw lastError ?? new NameGenerationError("TIMEOUT");
}

function toNamingContext({ surname, nameLength }: NameRequest): NamingContext {
  const surnameSyllables = countSelectedSurnameSyllables(surname);
  if (surname.source === "preset") {
    return {
      nameLength,
      surnameSyllables,
      surnameHangul: surname.hangul,
      surnameHanja: surname.hanja,
      surnameRomanization: surname.romanization,
    };
  }
  return surname.script === "hangul"
    ? {
        nameLength,
        surnameSyllables,
        surnameHangul: surname.value,
        surnameHanja: null,
        surnameRomanization: null,
      }
    : {
        nameLength,
        surnameSyllables,
        surnameHangul: null,
        surnameHanja: null,
        surnameRomanization: surname.value,
      };
}

function toGenerationError(
  error: unknown,
  signal: AbortSignal,
): NameGenerationError {
  if (error instanceof NameGenerationError) return error;
  if (signal.aborted) return abortToError(signal, error);
  return new NameGenerationError("INTERNAL_ERROR", {
    detail: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

/** 모델 구현이 중단 신호를 무시하더라도 제한 시간에 맞춰 반드시 끝낸다 */
function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    promise.catch(() => {});
    return Promise.reject(abortToError(signal));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortToError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortToError(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortToError(signal));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
