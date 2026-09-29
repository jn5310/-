import type { GenerateNameResult } from "./api";

/*
 * 이름 풀이(reading) — 이름 생성 한 번의 결과를 저장해 두고, 결제 여부에 따라 다르게 보여 준다.
 *
 * 무료 뷰에는 프리미엄 데이터(나머지 이름·한자·사주 풀이)를 절대 담지 않는다.
 * 화면에서 흐리게(blur) 처리하는 것만으로는 보호되지 않기 때문이다 — 잠긴 영역은 가짜 내용으로 채운다.
 */

/** 가격 — 최소 통화 단위 (USD 센트: 399 = $3.99) */
export interface PremiumOffer {
  amount: number;
  currency: string;
}

/** 무료로 공개하는 이름 1개: 한글 · 영문 발음 · 한 줄 의미 */
export interface FreeNamePreview {
  hangul: string;
  romanization: string;
  summary: string;
}

interface ReadingViewBase {
  /** 추측할 수 없는 128비트 ID — 이 ID를 아는 사람만 풀이를 볼 수 있다 */
  readingId: string;
  englishName: string;
  createdAt: string;
}

export interface FreeReadingView extends ReadingViewBase {
  tier: "free";
  name: FreeNamePreview;
  /** 잠겨 있는 추천 이름 수 */
  lockedNameCount: number;
  offer: PremiumOffer;
  /**
   * processing: 결제를 마치고 돌아왔지만 아직 결제 확정 전(웹훅 대기·지연 결제 수단)
   * — 화면은 잠시 뒤 다시 조회한다
   */
  payment?: "processing";
}

export interface PremiumReadingView extends ReadingViewBase {
  tier: "premium";
  unlockedAt: string;
  result: GenerateNameResult;
}

export type ReadingView = FreeReadingView | PremiumReadingView;
