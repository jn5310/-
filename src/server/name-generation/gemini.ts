import "server-only";

import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

import { abortToError, NameGenerationError } from "./errors";
import type { ModelUsage, NameModel } from "./generate-names";

/**
 * 기본 모델 — Google이 최신 Flash 모델로 갱신하는 별칭.
 * 운영에서는 GEMINI_MODEL로 버전을 고정해(예: gemini-3.5-flash) 모델 교체로 품질이 바뀌지 않게 하는 것을 권한다.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
export const DEFAULT_TIMEOUT_MS = 50_000;
/** route.ts의 maxDuration(60초) 안에서 응답을 돌려줄 수 있도록 상한을 둔다 */
const MAX_TIMEOUT_MS = 55_000;
const MIN_TIMEOUT_MS = 10_000;
/** 사고(thinking) 토큰도 이 한도에 포함된다 — 세 이름 분석 본문(약 2–3천 토큰)에 사고 분량까지 넉넉히 */
const MAX_OUTPUT_TOKENS = 32_768;

const THINKING_LEVELS: Record<string, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

export interface GeminiConfig {
  apiKey: string;
  model: string;
  /** 요청 하나(재시도 포함)의 전체 제한 시간 */
  timeoutMs: number;
  /** 사고 수준 — 지정하지 않으면 모델 기본값 (thinkingLevel을 지원하는 Gemini 3 계열 모델에서만 지정) */
  thinkingLevel?: ThinkingLevel;
}

export function readGeminiConfig(
  env: Record<string, string | undefined> = process.env,
): GeminiConfig {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new NameGenerationError("CONFIGURATION_ERROR", {
      detail: "GEMINI_API_KEY is not set.",
    });
  }

  const thinking = env.GEMINI_THINKING_LEVEL?.trim().toLowerCase();
  if (thinking && !(thinking in THINKING_LEVELS)) {
    throw new NameGenerationError("CONFIGURATION_ERROR", {
      detail: `GEMINI_THINKING_LEVEL must be one of ${Object.keys(THINKING_LEVELS).join(", ")}.`,
    });
  }

  const timeout = Number(env.GEMINI_TIMEOUT_MS);
  return {
    apiKey,
    model: env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    timeoutMs:
      Number.isFinite(timeout) && timeout > 0
        ? Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, timeout))
        : DEFAULT_TIMEOUT_MS,
    thinkingLevel: thinking ? THINKING_LEVELS[thinking] : undefined,
  };
}

let shared: { apiKey: string; client: GoogleGenAI } | null = null;

/** 서버리스 인스턴스 안에서 클라이언트를 재사용한다 */
function getSharedClient(apiKey: string): GoogleGenAI {
  if (shared?.apiKey !== apiKey) {
    // 재시도는 generate-names.ts가 전체 제한 시간 안에서 직접 관리하므로 SDK 재시도(retryOptions)는 켜지 않는다
    shared = { apiKey, client: new GoogleGenAI({ apiKey }) };
  }
  return shared.client;
}

/** Gemini 호출 어댑터 — SDK 응답·오류를 도메인 형태로 바꾼다 */
export function createGeminiModel(
  config: GeminiConfig,
  client: GoogleGenAI = getSharedClient(config.apiKey),
): NameModel {
  return {
    model: config.model,
    async generate({ systemInstruction, prompt, responseJsonSchema, signal }) {
      try {
        const response = await client.models.generateContent({
          model: config.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseJsonSchema,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            ...(config.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: config.thinkingLevel } }
              : {}),
            // 전체 제한 시간과 클라이언트 연결 종료를 함께 담은 신호 — 기다리던 HTTP 요청을 끊는다
            abortSignal: signal,
          },
        });
        const usage = response.usageMetadata;
        return {
          text: response.text,
          finishReason: response.candidates?.[0]?.finishReason,
          blockReason: response.promptFeedback?.blockReason,
          modelVersion: response.modelVersion,
          usage: usage
            ? ({
                promptTokens: usage.promptTokenCount ?? 0,
                outputTokens: usage.candidatesTokenCount ?? 0,
                thoughtsTokens: usage.thoughtsTokenCount ?? 0,
              } satisfies ModelUsage)
            : undefined,
        };
      } catch (error) {
        throw toUpstreamError(error, signal);
      }
    },
  };
}

function toUpstreamError(
  error: unknown,
  signal: AbortSignal,
): NameGenerationError {
  if (signal.aborted) return abortToError(signal, error);

  if (error instanceof ApiError) {
    const detail = `Gemini API ${error.status}: ${error.message.slice(0, 500)}`;
    if (error.status === 429) {
      return new NameGenerationError("RATE_LIMITED", {
        detail,
        cause: error,
        retryAfterMs: parseRetryDelayMs(error.message),
      });
    }
    if (error.status >= 500) {
      return new NameGenerationError("UPSTREAM_UNAVAILABLE", {
        detail,
        cause: error,
      });
    }
    // 잘못된 API 키는 400(API_KEY_INVALID)으로, 권한·모델 문제는 401/403/404로 온다
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.status === 404 ||
      /api[ _-]?key/i.test(error.message)
    ) {
      return new NameGenerationError("CONFIGURATION_ERROR", {
        detail,
        cause: error,
      });
    }
    return new NameGenerationError("UPSTREAM_ERROR", { detail, cause: error });
  }

  // fetch 자체가 실패한 경우(DNS·연결 끊김 등) — 잠시 뒤 다시 시도할 수 있다
  if (error instanceof TypeError) {
    return new NameGenerationError("UPSTREAM_UNAVAILABLE", {
      detail: `Network error: ${error.message}`,
      cause: error,
    });
  }

  return new NameGenerationError("UPSTREAM_ERROR", {
    detail: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

/**
 * 429 오류 본문의 google.rpc.RetryInfo.retryDelay(예: "17s", "0.5s")를 밀리초로 읽는다.
 * SDK는 오류 본문 JSON을 문자열로 message에 담아 준다.
 */
export function parseRetryDelayMs(message: string): number | undefined {
  try {
    const body = JSON.parse(message) as {
      error?: { details?: { "@type"?: string; retryDelay?: string }[] };
    };
    const delay = body.error?.details?.find((detail) =>
      detail["@type"]?.endsWith("google.rpc.RetryInfo"),
    )?.retryDelay;
    const seconds = delay ? Number.parseFloat(delay) : Number.NaN;
    return Number.isFinite(seconds) && seconds >= 0
      ? Math.round(seconds * 1000)
      : undefined;
  } catch {
    return undefined;
  }
}
