import { z } from "zod";

import type { SajuRequest } from "@/types/api";
import type { BirthFormValues } from "@/types/name";

import { birthFieldsSchema, toBirthInfo } from "./name-form";
import { birthRequestSchema } from "./name-request";

/*
 * 사주 분석 — 생년월일시만 받는다. 규칙은 이름 짓기와 같다 (같은 스키마를 함께 쓴다).
 * - 폼: 입력값(BirthFormValues) → 요청(SajuRequest)
 * - API: 클라이언트를 믿지 않고 같은 규칙으로 다시 검증한다 (시간대 정규화·미래 날짜 판정 포함)
 */

export const sajuFormSchema = z
  .object({ birth: birthFieldsSchema })
  .transform((values): SajuRequest => ({
    birth: toBirthInfo(values.birth),
  })) satisfies z.ZodType<SajuRequest, BirthFormValues>;

export const sajuRequestSchema = z.object({ birth: birthRequestSchema });
