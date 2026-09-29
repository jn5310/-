import type { SealShape } from "./types";

/** 선명한 인주(印朱) 빨강 */
export const SEAL_INK_COLOR = "#C8102E";

export const DEFAULT_SEAL_SHAPE: SealShape = "square";

/** 기본 출력 해상도 — 인쇄(300dpi 기준 약 8.7cm)와 SNS 공유에 충분한 크기 */
export const DEFAULT_SEAL_SIZE = 1024;
export const MIN_SEAL_SIZE = 128;
/** iOS Safari 캔버스 한도(약 1,670만 화소) 안쪽으로 제한한다 */
export const MAX_SEAL_SIZE = 4096;

export const MAX_SEAL_CHARACTERS = 4;

export function clampSealSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_SEAL_SIZE;
  return Math.min(MAX_SEAL_SIZE, Math.max(MIN_SEAL_SIZE, Math.round(size)));
}
