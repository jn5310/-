import type { Gender } from "@/types/name";

export interface GenderOptionMeta {
  label: string;
  hangul: string;
  description: string;
}

export const GENDER_OPTIONS = {
  male: {
    label: "Male",
    hangul: "남성",
    description: "Traditionally masculine sounds",
  },
  female: {
    label: "Female",
    hangul: "여성",
    description: "Traditionally feminine sounds",
  },
  neutral: {
    label: "Neutral",
    hangul: "중성",
    description: "Balanced names that suit anyone",
  },
} as const satisfies Record<Gender, GenderOptionMeta>;

/** 성을 뺀 이름(名) 음절 수 — 전체 자수에서 성씨 음절 수를 뺀 값 */
export type GivenNameSyllables = 1 | 2 | 3;

export interface GivenNameStyleMeta {
  title: string;
  /** 1음절 성 / 2음절 복성 기준 예시 */
  examples: {
    single: { hangul: string; romanization: string };
    compound?: { hangul: string; romanization: string };
  };
}

/**
 * 이름 자수 카드의 안내 문구는 '전체 자수'가 아니라 '이름 음절 수'로 정한다.
 * 같은 3자라도 김서윤(성1+이름2)은 보편형, 남궁현(성2+이름1)은 외자 이름이기 때문이다.
 */
export const GIVEN_NAME_STYLES: Record<GivenNameSyllables, GivenNameStyleMeta> =
  {
    1: {
      title: "Short & striking",
      examples: {
        single: { hangul: "김현", romanization: "Kim Hyun" },
        compound: { hangul: "남궁현", romanization: "Namgung Hyun" },
      },
    },
    2: {
      title: "Classic",
      examples: {
        single: { hangul: "김서윤", romanization: "Kim Seo-yun" },
        compound: { hangul: "남궁서윤", romanization: "Namgung Seo-yun" },
      },
    },
    3: {
      title: "Rare & poetic",
      examples: {
        single: { hangul: "김한가람", romanization: "Kim Han-ga-ram" },
      },
    },
  };

/** 가장 보편적인 한국 이름은 이름 2음절 (성1 + 이름2 = 3자) */
export const MOST_COMMON_GIVEN_SYLLABLES: GivenNameSyllables = 2;
