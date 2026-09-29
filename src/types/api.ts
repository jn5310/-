import type { BirthInfo, NameRequest } from "./name";
import type { ReadingView } from "./reading";
import type { FiveElement, SajuReading, SajuResult } from "./saju";

/*
 * API 계약 — 프론트엔드와 API가 함께 쓰는 타입.
 * - POST /api/generate-name  이름 생성 → 풀이 (페이월이 켜져 있으면 무료 미리보기, 꺼져 있으면 전체)
 * - GET  /api/readings/:id   풀이 조회 (결제했거나 무료 개방이면 PremiumReadingView)
 * - POST /api/checkout       Stripe Checkout 결제 페이지 URL 발급 (페이월이 꺼져 있으면 PAYMENTS_DISABLED)
 * - POST /api/stripe-webhook Stripe 전용 (결제 완료 → 프리미엄 잠금 해제)
 * - POST /api/saju           사주 분석 — 생년월일시만으로 원국·오행·총평 (저장하지 않음)
 */

/** 모든 API의 실패 응답 형식 */
export interface ApiFailure<Code extends string = string> {
  ok: false;
  error: {
    code: Code;
    /** 사용자에게 그대로 보여 줄 수 있는 영문 문구 */
    message: string;
    /** 같은 요청을 잠시 뒤 다시 보내면 성공할 수 있는지 */
    retryable: boolean;
    fieldErrors?: FieldIssue[];
  };
  meta: { requestId: string };
}

export type GenerateNameRequest = NameRequest;

/** 이름 한 글자 (성 포함) */
export interface NameCharacter {
  /** 한글 음절 (예: 민) */
  hangul: string;
  /** 한자 (예: 敏) */
  hanja: string;
  /** 한자의 영문 뜻 (예: "quick, clever") */
  meaning: string;
  /** 자원오행(字源五行) — 한자의 뜻·부수에서 오는 기운. 모델의 판단이며 서버가 따로 검증하지 않는다 */
  element: FiveElement;
  /** 발음오행(음령오행) — 초성 기준, 서버가 계산 */
  soundElement: FiveElement;
  isSurname: boolean;
}

/** 프리미엄 상세 분석 (영문) */
export interface PremiumAnalysis {
  /** 음양오행 · 사주 조화 */
  sajuHarmony: string;
  /** 발음 음령오행 */
  soundHarmony: string;
  /** 상세 운세 풀이 */
  fortune: string;
}

export interface GeneratedName {
  /** 성 포함 한글 이름 (예: 김민준) */
  hangul: string;
  /** 영문 발음 표기 (예: Kim Min-jun) */
  romanization: string;
  /** 글자별 한자를 이은 것 (예: 金敏俊) */
  hanja: string;
  characters: NameCharacter[];
  /** 무료 — 이름의 의미를 담은 영문 한 문장 */
  summary: string;
  /**
   * 프리미엄 상세 분석 — 결제한 풀이(PremiumReadingView)에만 들어 있다.
   * 무료 풀이는 GeneratedName 자체를 보내지 않는다 (FreeNamePreview만 보낸다).
   */
  premium: PremiumAnalysis | null;
}

export interface GenerateNameResult {
  names: GeneratedName[];
  /** 이름으로 보완한 오행 (용신·희신) — 모델이 원국을 해석해 정한 값이라 호출마다 달라질 수 있다 */
  favorableElements: FiveElement[];
  /** 서버가 만세력으로 계산한 사주 원국 */
  saju: SajuReading;
}

export interface GenerateNameSuccess {
  ok: true;
  /**
   * 새로 만든 풀이. 페이월이 켜져 있으면 무료 미리보기(전체 결과는 서버에 저장되고 결제 후 열린다),
   * 꺼져 있으면(무료 개방) 전체 풀이
   */
  data: ReadingView;
  meta: {
    requestId: string;
    /** 실제로 응답한 모델 버전 (예: gemini-3.5-flash) */
    model: string;
    generatedAt: string;
    durationMs: number;
    /** 모델 호출 횟수 (출력 검증 실패·일시 오류 시 재시도 포함) */
    attempts: number;
  };
}

export type GenerateNameErrorCode =
  | "INVALID_JSON"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_ERROR"
  | "CONTENT_BLOCKED"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_ERROR"
  | "INVALID_MODEL_OUTPUT"
  | "TIMEOUT"
  | "CLIENT_CLOSED"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

export interface FieldIssue {
  /**
   * 요청 본문(NameRequest) 기준 경로 (예: "birth.date").
   * 입력 폼 필드와 다른 것은 surname.id → surname.choice, surname.value → surname.custom 두 가지다.
   */
  path: string;
  message: string;
}

export type GenerateNameFailure = ApiFailure<GenerateNameErrorCode>;

export type GenerateNameResponse = GenerateNameSuccess | GenerateNameFailure;

// ─── 풀이 조회 · 결제 ─────────────────────────────────────────

/** 요청 본문을 읽다가 생기는 오류 (모든 POST API 공통) */
export type RequestBodyErrorCode =
  | "INVALID_JSON"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "CLIENT_CLOSED";

export type ReadingErrorCode =
  | "VALIDATION_ERROR"
  | "READING_NOT_FOUND"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

export interface ReadingSuccess {
  ok: true;
  data: ReadingView;
  meta: { requestId: string };
}

export type ReadingResponse = ReadingSuccess | ApiFailure<ReadingErrorCode>;

export interface CheckoutRequest {
  readingId: string;
  /** 브라우저의 GA4 식별자 — 서버가 보내는 purchase를 같은 사용자·세션으로 묶는다 (선택) */
  analytics?: { clientId?: string; sessionId?: string };
}

export type CheckoutErrorCode =
  | RequestBodyErrorCode
  | ReadingErrorCode
  /** 이미 결제한 풀이 — 중복 결제를 막는다 */
  | "ALREADY_UNLOCKED"
  /** 페이월이 꺼져 있다(무료 개방) — 결제할 필요가 없다 */
  | "PAYMENTS_DISABLED"
  /** Stripe API 오류·네트워크 문제 */
  | "PAYMENT_UNAVAILABLE";

export interface CheckoutSuccess {
  ok: true;
  /** Stripe가 호스팅하는 결제 페이지 — 브라우저를 이 주소로 보낸다 */
  data: { url: string };
  meta: { requestId: string };
}

export type CheckoutResponse = CheckoutSuccess | ApiFailure<CheckoutErrorCode>;

// ─── 사주 분석 ────────────────────────────────────────────────

export interface SajuRequest {
  birth: BirthInfo;
}

export type SajuErrorCode =
  RequestBodyErrorCode | "VALIDATION_ERROR" | "INTERNAL_ERROR";

export interface SajuSuccess {
  ok: true;
  data: SajuResult;
  meta: { requestId: string };
}

export type SajuResponse = SajuSuccess | ApiFailure<SajuErrorCode>;
