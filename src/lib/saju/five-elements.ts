import type { FiveElement } from "@/types/saju";

export interface FiveElementMeta {
  label: string;
  hanja: string;
  hangul: string;
  /** 오방색(五方色) 스와치용 Tailwind 클래스 — globals.css 테마 색상과 연결 */
  swatchClass: string;
}

/** 상생(相生) 순서: 木 → 火 → 土 → 金 → 水 */
export const FIVE_ELEMENTS = [
  "wood",
  "fire",
  "earth",
  "metal",
  "water",
] as const satisfies readonly FiveElement[];

export const FIVE_ELEMENT_META = {
  wood: { label: "Wood", hanja: "木", hangul: "목", swatchClass: "bg-wood" }, // 靑 · 동
  fire: { label: "Fire", hanja: "火", hangul: "화", swatchClass: "bg-fire" }, // 赤 · 남
  earth: { label: "Earth", hanja: "土", hangul: "토", swatchClass: "bg-earth" }, // 黃 · 중앙
  metal: { label: "Metal", hanja: "金", hangul: "금", swatchClass: "bg-metal" }, // 白 · 서
  water: { label: "Water", hanja: "水", hangul: "수", swatchClass: "bg-water" }, // 黑 · 북
} as const satisfies Record<FiveElement, FiveElementMeta>;
