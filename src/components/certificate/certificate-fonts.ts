import { Font } from "@react-pdf/renderer";

import { hashString } from "@/lib/seal/random";

/*
 * 증명서 PDF 폰트 — Noto Serif KR · Noto Sans KR (사이트와 같은 글꼴).
 *
 * 한글·한자 폰트 원본은 10–20MB라, 증명서에 쓰는 글자만 담은 서브셋을 /api/fonts/subset에서 받는다.
 * 받은 바이트를 data URL로 등록해 react-pdf가 같은 파일을 다시 내려받지 않게 한다.
 * react-pdf는 같은 이름으로 다시 등록하면 처음 것을 쓰므로, 글자 집합마다 이름을 따로 붙인다.
 */

export interface CertificateFontFamilies {
  serif: string;
  sans: string;
}

const WEIGHTS = [400, 700] as const;
const FAMILIES = ["serif", "sans"] as const;
const FETCH_TIMEOUT_MS = 20_000;

const loaded = new Map<string, Promise<CertificateFontFamilies>>();

/** 글자 집합에 맞는 서브셋 폰트를 받아 등록하고, 스타일에 쓸 글꼴 이름을 돌려준다 */
export function loadCertificateFonts(
  characters: string,
): Promise<CertificateFontFamilies> {
  const key = hashString(characters).toString(36);
  let pending = loaded.get(key);
  if (!pending) {
    pending = registerFonts(key, characters);
    // 실패하면 다음에 다시 시도할 수 있게 지운다
    pending.catch(() => loaded.delete(key));
    loaded.set(key, pending);
  }
  return pending;
}

async function registerFonts(
  key: string,
  characters: string,
): Promise<CertificateFontFamilies> {
  const families: CertificateFontFamilies = {
    serif: `KNS Serif ${key}`,
    sans: `KNS Sans ${key}`,
  };

  const sources = await Promise.all(
    FAMILIES.map((family) =>
      Promise.all(
        WEIGHTS.map(async (fontWeight) => ({
          fontWeight,
          src: await fetchSubsetDataUrl(family, fontWeight, characters),
        })),
      ),
    ),
  );

  Font.register({ family: families.serif, fonts: sources[0] });
  Font.register({ family: families.sans, fonts: sources[1] });
  Font.registerHyphenationCallback(breakWords);
  return families;
}

async function fetchSubsetDataUrl(
  family: (typeof FAMILIES)[number],
  weight: number,
  characters: string,
): Promise<string> {
  const params = new URLSearchParams({
    family,
    weight: String(weight),
    text: characters,
  });
  const response = await fetch(`/api/fonts/subset?${params}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `Font subset ${family} ${weight} failed: HTTP ${response.status}`,
    );
  }
  const type = response.headers.get("content-type") ?? "font/ttf";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return `data:${type};base64,${toBase64(bytes)}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/** 한글·한자·가나 등 띄어쓰기 없이도 줄을 바꿀 수 있는 글자 */
const CJK =
  /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/;

/**
 * 줄바꿈 규칙: 영문 단어는 자르지 않고(하이픈 없음), 한글·한자는 글자 사이 어디서나 바꾼다.
 * react-pdf는 음절 사이에서 줄을 바꾸면 하이픈을 넣는데, 빈 문자열 조각은 폭 0인 공백으로 처리되어
 * 하이픈 없이 줄을 바꿀 수 있는 자리가 된다.
 */
function breakWords(word: string): string[] {
  if (!CJK.test(word)) return [word];
  return Array.from(word).flatMap((character) => [character, ""]);
}
