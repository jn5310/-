/** 이름 카드 아트보드 크기 (CSS px) — 저장할 때 NAME_CARD_EXPORT_SCALE배로 그린다 */
export const NAME_CARD_WIDTH = 360;
export const NAME_CARD_HEIGHT = 450;

/** 1080 × 1350 PNG — 인스타그램 피드 세로형(4:5)·카카오톡·X에 알맞은 크기 */
export const NAME_CARD_EXPORT_SCALE = 3;

/** 카드 배경색 (한지) — 이미지 바탕을 투명하지 않게 채운다 */
export const NAME_CARD_BACKGROUND = "#f6f1e7";

/**
 * 저장용 이미지에 넣는 서브셋 폰트의 이름.
 * 화면에는 이 이름의 폰트가 없어 사이트 폰트로 그리고, 이미지 안에서는 이 이름으로 넣은 폰트를 쓴다.
 */
export const NAME_CARD_FONT_FAMILIES = {
  serif: "KNS Card Serif",
  sans: "KNS Card Sans",
} as const;
