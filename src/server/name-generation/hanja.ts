import { HANJA_READINGS_DATA } from "./hanja-readings";

export interface HanjaInfo {
  /** 한국 한자음 — 두음법칙에 따른 음까지 포함 (예: 李 → 리, 이) */
  readings: readonly string[];
  /** 인명에 쓸 수 있는 글자인지 (Unihan kHangul의 E·N 출처: 교육용 기초 한자·인명용 한자) */
  forNames: boolean;
}

let table: Map<string, HanjaInfo> | null = null;

function getTable(): Map<string, HanjaInfo> {
  if (!table) {
    table = new Map();
    for (const entry of HANJA_READINGS_DATA.split("|")) {
      const forNames = entry.startsWith("+");
      const [hanja, ...readings] = Array.from(
        forNames ? entry.slice(1) : entry,
      );
      table.set(hanja, { readings, forNames });
    }
  }
  return table;
}

/** 한자 한 글자의 한국 한자음 정보 (NFC 정규화한 글자로 찾는다) */
export function lookupHanja(hanja: string): HanjaInfo | undefined {
  return getTable().get(hanja.normalize("NFC"));
}

/**
 * 뜻이 흉해 전통적으로 이름에 쓰지 않는 글자 — 모델이 실수로 고르지 않도록 막는 최소한의 안전장치.
 * (학파마다 다른 '불용문자' 논쟁 대상은 넣지 않고, 뜻 자체가 부정적인 글자만 담는다.)
 */
export const AVOIDED_HANJA: ReadonlySet<string> = new Set(
  Array.from(
    "死亡病鬼殺惡凶災禍毒貧敗哭屍墓葬喪苦痛悲哀怨恨罪刑賊盜奴卑賤狂醜愚欺詐淫妖",
  ),
);
