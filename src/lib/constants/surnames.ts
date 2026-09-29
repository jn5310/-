import {
  PRESET_SURNAME_IDS,
  type PresetSurnameId,
  type SurnameOption,
} from "@/types/name";

/**
 * 대표 성씨 12선 — 통계청 2015 인구주택총조사 인구 순.
 *
 * - hanja: 같은 한글 성씨 중 인구가 가장 많은 한자.
 *   정(鄭·丁), 조(趙·曺), 장(張·蔣), 임(林·任), 강(姜·康)처럼 동음이자 성씨는
 *   수리(획수) 분석 정확도를 위해 추후 '한자·본관 선택' 단계로 확장한다.
 * - romanization: 국어의 로마자 표기법(이 → I, 박 → Bak)보다
 *   여권·K-pop에서 널리 쓰이는 관용 표기를 우선한다.
 */
const SURNAME_DATA = {
  kim: { hangul: "김", hanja: "金", romanization: "Kim" },
  lee: { hangul: "이", hanja: "李", romanization: "Lee" },
  park: { hangul: "박", hanja: "朴", romanization: "Park" },
  choi: { hangul: "최", hanja: "崔", romanization: "Choi" },
  jung: { hangul: "정", hanja: "鄭", romanization: "Jung" },
  kang: { hangul: "강", hanja: "姜", romanization: "Kang" },
  cho: { hangul: "조", hanja: "趙", romanization: "Cho" },
  yoon: { hangul: "윤", hanja: "尹", romanization: "Yoon" },
  jang: { hangul: "장", hanja: "張", romanization: "Jang" },
  lim: { hangul: "임", hanja: "林", romanization: "Lim" },
  han: { hangul: "한", hanja: "韓", romanization: "Han" },
  oh: { hangul: "오", hanja: "吳", romanization: "Oh" },
} satisfies Record<PresetSurnameId, Omit<SurnameOption, "id">>;

export const SURNAME_OPTIONS: readonly SurnameOption[] = PRESET_SURNAME_IDS.map(
  (id) => ({ id, ...SURNAME_DATA[id] }),
);

export function getSurnameOption(id: PresetSurnameId): SurnameOption {
  return { id, ...SURNAME_DATA[id] };
}
