import type { FiveElement } from "@/types/saju";

/*
 * 발음오행(음령오행, 音靈五行) — 음절의 초성으로 오행을 정한다.
 * 작명 현장에서 널리 쓰는 기준: ㄱㅋ=木 · ㄴㄷㄹㅌ=火 · ㅇㅎ=土 · ㅅㅈㅊ=金 · ㅁㅂㅍ=水
 * (훈민정음 해례본을 따르는 학파는 ㅇㅎ=水, ㅁㅂㅍ=土로 본다 — 프롬프트도 이 표와 같은 기준을 쓴다)
 */
const INITIAL_CONSONANT_ELEMENTS: readonly FiveElement[] = [
  "wood", // ㄱ
  "wood", // ㄲ
  "fire", // ㄴ
  "fire", // ㄷ
  "fire", // ㄸ
  "fire", // ㄹ
  "water", // ㅁ
  "water", // ㅂ
  "water", // ㅃ
  "metal", // ㅅ
  "metal", // ㅆ
  "earth", // ㅇ
  "metal", // ㅈ
  "metal", // ㅉ
  "metal", // ㅊ
  "wood", // ㅋ
  "fire", // ㅌ
  "water", // ㅍ
  "earth", // ㅎ
];

const HANGUL_BASE = 0xac00;
const SYLLABLE_COUNT = 11172;
/** 중성 21 × 종성 28 */
const SYLLABLES_PER_INITIAL = 588;

/** 한글 한 음절의 발음오행 (한글 음절이 아니면 null) */
export function getSoundElement(syllable: string): FiveElement | null {
  if (syllable.length !== 1) return null;
  const offset = syllable.charCodeAt(0) - HANGUL_BASE;
  if (offset < 0 || offset >= SYLLABLE_COUNT) return null;
  return INITIAL_CONSONANT_ELEMENTS[Math.floor(offset / SYLLABLES_PER_INITIAL)];
}
