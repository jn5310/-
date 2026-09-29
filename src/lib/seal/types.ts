export const SEAL_SHAPES = ["square", "circle"] as const;
export type SealShape = (typeof SEAL_SHAPES)[number];

/**
 * 캔버스에 쓸 폰트.
 * family는 CSS font-family 목록을 그대로 쓴다. 캔버스는 CSS 변수(var(--…))를 해석하지 못하므로
 * next/font의 `style.fontFamily`처럼 실제 글꼴 이름이어야 한다.
 */
export interface SealFont {
  family: string;
  weight: number;
  /** 잉크 번짐: 획을 모든 방향으로 고르게 두껍게 한다 (도장 한 변 대비 비율, 0이면 끔) */
  inkSpread?: number;
}

export interface SealRenderOptions {
  shape: SealShape;
  /** 출력 해상도(px) — 정사각형 한 변 */
  size: number;
  /** 인주 색 */
  color: string;
  font: SealFont;
  /** 인주 질감(가장자리 마모·잉크 반점·농담 얼룩) */
  texture: boolean;
}
