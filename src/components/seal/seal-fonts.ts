import { Gasoek_One, Nanum_Myeongjo, Song_Myung } from "next/font/google";

import type { SealFont } from "@/lib/seal";

/*
 * 도장(캔버스) 전용 웹 폰트.
 * 페이지를 열 때 미리 받지 않고(preload 끔), 도장을 그릴 때 새길 글자가 든
 * unicode-range 조각만 내려받는다 — loadSealFont()가 이 일을 맡는다.
 */
// 송명은 미리 받을 수 있는 subset이 없어 next/font가 preload를 알아서 끈다 — preload 옵션 자체가 없다
const songMyung = Song_Myung({
  weight: "400",
  display: "swap",
});
const nanumMyeongjo = Nanum_Myeongjo({
  weight: "800",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const gasoekOne = Gasoek_One({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

/**
 * 송명·가석은 KS X 1001 완성형 2,350자만 담고 있다.
 * 그 밖의 음절은 한글 11,172자를 모두 갖춘 나눔명조로 이어 그린다.
 */
const HANGUL_FALLBACK = nanumMyeongjo.style.fontFamily;

export interface SealFontPreset {
  label: string;
  hangul: string;
  description: string;
  font: SealFont;
}

export const SEAL_FONTS = {
  brush: {
    label: "Brush",
    hangul: "붓글씨",
    description: "Flowing brush strokes in the spirit of Gungseo calligraphy",
    font: {
      family: `${songMyung.style.fontFamily}, ${HANGUL_FALLBACK}`,
      weight: 400,
      // 가는 붓 획을 인장답게 고르게 두껍게
      inkSpread: 0.006,
    },
  },
  classic: {
    label: "Classic",
    hangul: "명조",
    description: "A crisp Myeongjo serif — the easiest to read",
    font: {
      family: HANGUL_FALLBACK,
      weight: 800,
      inkSpread: 0.003,
    },
  },
  carved: {
    label: "Carved",
    hangul: "각인",
    description: "Bold strokes that fill the stone, like seal script",
    font: {
      family: `${gasoekOne.style.fontFamily}, ${HANGUL_FALLBACK}`,
      weight: 400,
      inkSpread: 0,
    },
  },
} as const satisfies Record<string, SealFontPreset>;

export type SealFontId = keyof typeof SEAL_FONTS;

export const SEAL_FONT_IDS = Object.keys(SEAL_FONTS) as SealFontId[];

export const DEFAULT_SEAL_FONT: SealFontId = "brush";
