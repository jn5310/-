import { MAX_SEAL_CHARACTERS } from "./constants";

/** 완성형 한글 음절만 허용한다 (자모 단독·영문·숫자 제외) */
const HANGUL_SYLLABLES = /^[가-힣]+$/;

export type SealTextError = "empty" | "not-hangul" | "too-long";

export type SealTextResult =
  | { ok: true; text: string; characters: string[] }
  | { ok: false; error: SealTextError; message: string };

const MESSAGES: Record<SealTextError, string> = {
  empty: "Enter a name in Hangul to carve your seal.",
  "not-hangul": "Use complete Hangul syllables only (e.g. 김민준).",
  "too-long": `A seal fits up to ${MAX_SEAL_CHARACTERS} characters.`,
};

/**
 * 도장에 새길 글자를 정리·검증한다.
 * NFC 정규화로 풀어쓴 자모(예: macOS에서 붙여 넣은 NFD 문자열)를 음절로 합치고, 공백은 없앤다.
 */
export function parseSealText(input: string): SealTextResult {
  const text = input.normalize("NFC").replace(/\s+/g, "");

  let error: SealTextError | null = null;
  if (text === "") error = "empty";
  else if (!HANGUL_SYLLABLES.test(text)) error = "not-hangul";
  else if (text.length > MAX_SEAL_CHARACTERS) error = "too-long";

  if (error) return { ok: false, error, message: MESSAGES[error] };
  return { ok: true, text, characters: Array.from(text) };
}
