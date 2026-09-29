import { z } from "zod";

import { FIVE_ELEMENTS } from "@/lib/saju/five-elements";

/*
 * Gemini 응답 스키마.
 * 같은 Zod 스키마로 ① Gemini에 넘길 JSON Schema(responseJsonSchema)를 만들고 ② 응답을 검증한다.
 * 구조만 정의하고, 글자 수·한자·언어 같은 규칙은 parse-output.ts에서 따로 확인한다
 * (Gemini JSON Schema는 minLength·pattern 등을 지원하지 않는다).
 */

const element = z.enum(FIVE_ELEMENTS);

const characterSchema = z.object({
  hangul: z.string().describe("한글 한 음절 (예: 민)"),
  hanja: z.string().describe("그 음절의 한자 한 글자 (예: 敏)"),
  meaning: z.string().describe('한자의 뜻, 영어 1–4단어 (예: "quick, clever")'),
  element: element.describe("자원오행(字源五行)"),
});

const nameSchema = z.object({
  hangul: z.string().describe("성을 포함한 한글 이름 (예: 김민준)"),
  romanization: z
    .string()
    .describe('영문 발음 표기, 성과 이름을 띄어 쓴다 (예: "Kim Min-jun")'),
  characters: z
    .array(characterSchema)
    .describe("성부터 마지막 음절까지 한 음절씩 순서대로"),
  summary: z.string().describe("무료 요약 — 이름의 의미를 담은 영어 한 문장"),
  premium: z.object({
    sajuHarmony: z
      .string()
      .describe("프리미엄: 음양오행·사주 조화 분석 (English)"),
    soundHarmony: z.string().describe("프리미엄: 발음 음령오행 분석 (English)"),
    fortune: z.string().describe("프리미엄: 상세 운세 풀이 (English)"),
  }),
});

export const modelOutputSchema = z.object({
  favorableElements: z
    .array(element)
    .min(1)
    .max(2)
    .describe("이름으로 보완할 오행 — 용신·희신 1–2개"),
  names: z.array(nameSchema).length(3).describe("추천 이름 3개"),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;

/** Gemini responseJsonSchema가 받아들이는 키 (@google/genai GenerateContentConfig 문서 기준) */
const SUPPORTED_KEYS = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);

type JsonSchema = { [key: string]: unknown };

const isRecord = (value: unknown): value is JsonSchema =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** 지원하지 않는 키($schema 등)를 걷어내고, 객체마다 propertyOrdering을 붙여 출력 순서를 고정한다 */
function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;

  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!SUPPORTED_KEYS.has(key)) continue;
    // properties·$defs는 키가 스키마 이름이므로 이름은 그대로 두고 값(하위 스키마)만 정리한다
    if ((key === "properties" || key === "$defs") && isRecord(value)) {
      result[key] = Object.fromEntries(
        Object.entries(value).map(([name, child]) => [
          name,
          toGeminiSchema(child),
        ]),
      );
      if (key === "properties") result.propertyOrdering = Object.keys(value);
    } else {
      result[key] = toGeminiSchema(value);
    }
  }
  return result;
}

/**
 * 용신(favorableElements)을 먼저 정한 뒤 이름을 짓도록 속성 순서가 곧 사고 순서가 되게 둔다.
 * 이름 안에서도 한글 → 표기 → 글자 풀이 → 요약 → 분석 순이다.
 */
export const MODEL_OUTPUT_JSON_SCHEMA = toGeminiSchema(
  z.toJSONSchema(modelOutputSchema),
);
