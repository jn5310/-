import type { HeavenlyStem } from "@/types/saju";

/*
 * 일간(日干) 10종의 자연물 비유 — 전통적인 비유(甲 큰 나무, 丙 태양, 壬 큰 바다 …).
 * 사주 풀이(interpretation.ts)와 이름 카드가 함께 쓴다. 풀이 문장은 크기가 커서 따로 둔다
 * (이름 카드는 이 짧은 표만 불러온다).
 */
export const DAY_MASTER_IMAGES: Record<
  HeavenlyStem,
  { image: string; imageKo: string }
> = {
  gap: { image: "The Great Tree", imageKo: "큰 나무" },
  eul: { image: "The Flower & Vine", imageKo: "화초 · 덩굴" },
  byeong: { image: "The Sun", imageKo: "태양" },
  jeong: { image: "The Candle", imageKo: "촛불 · 등불" },
  mu: { image: "The Mountain", imageKo: "큰 산" },
  gi: { image: "The Garden Soil", imageKo: "기름진 땅" },
  gyeong: { image: "The Sword", imageKo: "쇠 · 칼" },
  sin: { image: "The Jewel", imageKo: "보석" },
  im: { image: "The Ocean", imageKo: "큰 바다" },
  gye: { image: "The Rain & Dew", imageKo: "비 · 이슬" },
};
