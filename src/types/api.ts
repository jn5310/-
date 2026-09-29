import type { NameRequest } from "./name";
import type { FiveElement, SajuReading } from "./saju";

/*
 * POST /api/generate-name 계약 — 프론트엔드와 API가 함께 쓰는 타입.
 * 요청 본문은 입력 폼이 만드는 NameRequest 그대로다.
 */

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
   * 프리미엄 — 결제·인증 연동 전까지는 항상 채워진다.
   * 연동 후에는 권한이 없으면 서버가 null로 보낸다 (화면에서 숨기는 것만으로는 보호되지 않는다).
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
  data: GenerateNameResult;
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

export interface GenerateNameFailure {
  ok: false;
  error: {
    code: GenerateNameErrorCode;
    /** 사용자에게 그대로 보여 줄 수 있는 영문 문구 */
    message: string;
    /** 같은 요청을 잠시 뒤 다시 보내면 성공할 수 있는지 */
    retryable: boolean;
    fieldErrors?: FieldIssue[];
  };
  meta: { requestId: string };
}

export type GenerateNameResponse = GenerateNameSuccess | GenerateNameFailure;
