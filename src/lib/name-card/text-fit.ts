/*
 * 이름 카드 글 맞춤 — 정해진 줄 수를 넘는 글을 단어 경계에서 자르고 "..."를 붙인다.
 *
 * CSS 여러 줄 말줄임(-webkit-line-clamp)은 html-to-image가 계산된 스타일을 옮기는 사이에 풀린다
 * (크롬은 그 상자의 display를 flow-root로 돌려주어, 이미지에서는 말줄임표 없이 글이 잘린다).
 * 그래서 화면과 이미지가 같은 글을 그리도록 글꼴의 글자 폭으로 줄 바꿈을 미리 계산한다.
 *
 * 글자 폭: Noto Serif KR · Noto Sans KR Regular의 hmtx (1000 단위, 라틴 글자는 Google Fonts 판과 같다).
 * 커닝을 빼고(대개 폭을 줄인다) 줄 폭을 3% 좁게 잡고, 띄어쓰기에서만 줄을 바꾼다고 본다 —
 * 브라우저는 하이픈 뒤 등에서도 줄을 바꿀 수 있어, 실제 줄 수가 계산보다 많아지지 않는다.
 * 말줄임표(…)는 두 글꼴에서 한자 폭(1000)의 넓은 모양이라 영어 문장에는 마침표 세 개를 쓴다.
 */

export type CardFont = "serif" | "sans";

export interface TextBox {
  font: CardFont;
  /** px */
  fontSize: number;
  /** 글 상자 폭 (px) */
  width: number;
}

export interface FitOptions extends TextBox {
  maxLines: number;
  /** 글 앞뒤에 붙는 문자 (예: 따옴표) — 줄 계산에 넣고, 자를 때도 남긴다 */
  before?: string;
  after?: string;
}

export const TRUNCATION_MARK = "...";

/** 줄 폭 여유 — 커닝·반올림 차이를 덮는다 */
const WIDTH_SAFETY = 0.97;

// U+0020–U+007E (95자)
// prettier-ignore
const SERIF_ASCII = [
  256, 308, 376, 574, 550, 923, 779, 196, 364, 364, 478, 580, 327, 346, 327, 352,
  557, 471, 558, 557, 555, 558, 558, 549, 558, 562, 327, 327, 580, 580, 580, 432,
  912, 718, 670, 691, 770, 652, 629, 741, 853, 405, 403, 731, 625, 975, 796, 767,
  641, 767, 715, 567, 659, 797, 714, 1053, 700, 687, 605, 344, 352, 344, 580, 563,
  435, 557, 638, 538, 629, 547, 388, 566, 663, 332, 311, 607, 334, 974, 661, 596,
  638, 607, 462, 473, 367, 653, 548, 838, 564, 552, 498, 374, 316, 374, 580,
] as const;

// prettier-ignore
const SANS_ASCII = [
  224, 323, 474, 555, 555, 921, 680, 278, 338, 338, 467, 555, 278, 347, 278, 392,
  555, 555, 555, 555, 555, 555, 555, 555, 555, 555, 278, 278, 555, 555, 555, 474,
  946, 608, 657, 638, 688, 589, 552, 689, 728, 293, 535, 646, 543, 812, 723, 742,
  633, 742, 635, 596, 599, 721, 575, 878, 573, 531, 603, 338, 392, 338, 555, 559,
  606, 563, 618, 510, 620, 554, 325, 564, 607, 275, 275, 552, 284, 926, 610, 606,
  620, 620, 388, 468, 377, 607, 521, 802, 498, 521, 475, 338, 270, 338, 555,
] as const;

interface FontMetrics {
  ascii: readonly number[];
  punctuation: Readonly<Record<string, number>>;
  hangul: number;
}

const METRICS: Record<CardFont, FontMetrics> = {
  serif: {
    ascii: SERIF_ASCII,
    punctuation: {
      "“": 426,
      "”": 425,
      "‘": 232,
      "’": 232,
      "—": 890,
      "–": 563,
      "·": 327,
      "…": 1000,
    },
    hangul: 966,
  },
  sans: {
    ascii: SANS_ASCII,
    punctuation: {
      "“": 474,
      "”": 474,
      "‘": 278,
      "’": 278,
      "—": 894,
      "–": 536,
      "·": 561,
      "…": 1000,
    },
    hangul: 920,
  },
};

/** 모르는 글자의 폭 — 라틴 대문자 평균보다 조금 넓게 */
const FALLBACK_ADVANCE = 700;
const WIDE_ADVANCE = 1000;

function advanceOf(character: string, metrics: FontMetrics): number {
  const code = character.codePointAt(0) ?? 0;
  if (code >= 0x20 && code <= 0x7e) return metrics.ascii[code - 0x20];
  const punctuation = metrics.punctuation[character];
  if (punctuation !== undefined) return punctuation;
  if (code >= 0xac00 && code <= 0xd7a3) return metrics.hangul;
  if (isWide(code)) return WIDE_ADVANCE;
  // é → e 처럼 발음 구별 기호를 뗀 글자의 폭
  const base = character.normalize("NFD").codePointAt(0) ?? 0;
  if (base !== code && base >= 0x20 && base <= 0x7e) {
    return metrics.ascii[base - 0x20];
  }
  return FALLBACK_ADVANCE;
}

/** 한자·한글 자모·전각 기호 */
function isWide(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xa960 && code <= 0xa97f) ||
    (code >= 0xd7b0 && code <= 0xd7ff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x20000 && code <= 0x3ffff)
  );
}

/** 글 폭 (px) */
export function measureText(
  text: string,
  font: CardFont,
  fontSize: number,
): number {
  const metrics = METRICS[font];
  let units = 0;
  for (const character of text) units += advanceOf(character, metrics);
  return (units / 1000) * fontSize;
}

const collapse = (text: string) =>
  text.normalize("NFC").replace(/\s+/g, " ").trim();

/**
 * 브라우저처럼 줄을 나눈다 — 띄어쓰기에서 바꾸고, 한 줄보다 긴 낱말은 글자 단위로 끊는다
 * (overflow-wrap: anywhere).
 */
export function wrapText(text: string, box: TextBox): string[] {
  const limit = box.width * WIDTH_SAFETY;
  const fits = (line: string) =>
    measureText(line, box.font, box.fontSize) <= limit;

  const lines: string[] = [];
  let line = "";
  for (const word of collapse(text).split(" ")) {
    if (word === "") continue;
    const joined = line ? `${line} ${word}` : word;
    if (fits(joined)) {
      line = joined;
      continue;
    }
    if (line) lines.push(line);
    if (fits(word)) {
      line = word;
      continue;
    }
    let piece = "";
    for (const character of word) {
      if (piece && !fits(piece + character)) {
        lines.push(piece);
        piece = character;
      } else {
        piece += character;
      }
    }
    line = piece;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * maxLines 줄 안에 들어가게 맞춘 글 (before·after 포함).
 * 넘치면 낱말 경계에서 자르고 끝의 쉼표·마침표 등을 떼어 "..."를 붙인다.
 */
export function fitText(text: string, options: FitOptions): string {
  const { maxLines, before = "", after = "" } = options;
  const clean = collapse(text);
  const fitsIn = (body: string) =>
    wrapText(`${before}${body}${after}`, options).length <= maxLines;

  if (fitsIn(clean)) return `${before}${clean}${after}`;

  const truncated = (head: string) =>
    `${head.replace(/[\s,.;:!?·—–-]+$/u, "")}${TRUNCATION_MARK}`;

  const words = clean.split(" ");
  for (let count = words.length - 1; count > 0; count--) {
    const body = truncated(words.slice(0, count).join(" "));
    if (fitsIn(body)) return `${before}${body}${after}`;
  }
  // 첫 낱말부터 넘친다 — 글자 단위로
  const characters = Array.from(words[0] ?? "");
  for (let count = characters.length - 1; count > 0; count--) {
    const body = truncated(characters.slice(0, count).join(""));
    if (fitsIn(body)) return `${before}${body}${after}`;
  }
  return `${before}${TRUNCATION_MARK}${after}`;
}
