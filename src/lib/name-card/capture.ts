import {
  fetchSubsetFont,
  fontFormatOf,
  type SubsetFamily,
  type SubsetWeight,
} from "@/lib/fonts/subset-client";

import {
  NAME_CARD_BACKGROUND,
  NAME_CARD_EXPORT_SCALE,
  NAME_CARD_FONT_FAMILIES,
  NAME_CARD_HEIGHT,
  NAME_CARD_WIDTH,
} from "./constants";

/*
 * 이름 카드 → PNG (브라우저 전용).
 *
 * 1. html-to-image의 toSvg로 화면의 카드 DOM을 SVG(foreignObject)로 옮긴다 — 스타일은 계산값 그대로 복사된다.
 * 2. 글꼴: html-to-image가 문서의 폰트를 알아서 찾게 두면 next/font가 나눠 둔 한글 폰트 조각을 수백 개
 *    내려받는다. 대신 카드에 나오는 글자만 담은 서브셋(/api/fonts/subset)을 data URL로 넣는다(fontEmbedCSS).
 * 3. SVG를 캔버스에 3배로 그려 PNG로 만든다. 사파리(WebKit)·파이어폭스는 SVG 안의 글꼴·이미지를 첫 그리기
 *    뒤에 풀기도 해서, 잠시 간격을 두고 몇 번 다시 그린다 (html-to-image는 한 번만 그린다).
 */

const FONT_FACES: { family: SubsetFamily; weight: SubsetWeight }[] = [
  { family: "serif", weight: 400 },
  { family: "serif", weight: 700 },
  { family: "sans", weight: 400 },
  { family: "sans", weight: 700 },
];

const REDRAW_COUNT = 3;
const REDRAW_INTERVAL_MS = 120;
/** 폰트를 이보다 오래 기다리지 않는다 — 공유 버튼이 이미지를 기다리므로 (늦으면 기기 글꼴로 그린다) */
const FONT_TIMEOUT_MS = 10_000;

// ─── 글꼴 ────────────────────────────────────────────────────

/** 서브셋에 담을 글자 — 카드 글자를 중복 없이 코드 포인트 순으로 (같은 집합은 같은 요청이 된다) */
export function nameCardCharacters(text: string): string {
  const characters = new Set<string>();
  for (const character of text.normalize("NFC")) {
    if (/\s/.test(character)) continue;
    characters.add(character);
  }
  return [...characters]
    .sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0))
    .join("");
}

const fontCssCache = new Map<string, Promise<string>>();

/**
 * 카드 글자만 담은 폰트를 받아 @font-face CSS(data URL)로 만든다 — html-to-image의 fontEmbedCSS.
 * 같은 글자 집합은 한 번만 받는다 (도장 모양을 바꿔 다시 그릴 때 등).
 */
export function loadNameCardFontCss(
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const characters = nameCardCharacters(text);
  let pending = fontCssCache.get(characters);
  if (!pending) {
    pending = buildFontCss(characters, fetchImpl);
    // 실패하면 다음에 다시 받을 수 있게 지운다
    pending.catch(() => fontCssCache.delete(characters));
    fontCssCache.set(characters, pending);
  }
  return pending;
}

async function buildFontCss(
  characters: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const faces = await Promise.all(
    FONT_FACES.map(async ({ family, weight }) => {
      const font = await fetchSubsetFont(family, weight, characters, {
        fetchImpl,
        timeoutMs: FONT_TIMEOUT_MS,
      });
      return fontFaceRule(
        NAME_CARD_FONT_FAMILIES[family],
        weight,
        font.dataUrl,
        fontFormatOf(font.contentType),
      );
    }),
  );
  return faces.join("\n");
}

export function fontFaceRule(
  family: string,
  weight: number,
  dataUrl: string,
  format: string,
): string {
  return `@font-face{font-family:"${family}";src:url(${dataUrl}) format("${format}");font-weight:${weight};font-style:normal;font-display:block;}`;
}

// ─── 그리기 ──────────────────────────────────────────────────

export interface RenderNameCardOptions {
  /** loadNameCardFontCss의 결과. 받지 못했으면 null — 기기 글꼴로 그린다 */
  fontCss: string | null;
  scale?: number;
}

export async function renderNameCardPng(
  node: HTMLElement,
  { fontCss, scale = NAME_CARD_EXPORT_SCALE }: RenderNameCardOptions,
): Promise<Blob> {
  const { toSvg } = await import("html-to-image");
  const svg = await toSvg(node, {
    width: NAME_CARD_WIDTH,
    height: NAME_CARD_HEIGHT,
    // 빈 문자열이어도 "직접 넣었다"로 본다 — html-to-image가 문서의 한글 폰트 조각을 모두 받으러 가지 않게
    fontEmbedCSS: fontCss ?? "",
    cacheBust: false,
    backgroundColor: NAME_CARD_BACKGROUND,
    // 화면에서 줄이려고 감싼 쪽의 변형과 무관하게 원래 크기로
    style: { transform: "none", margin: "0" },
  });
  return rasterizeSvg(svg, NAME_CARD_WIDTH, NAME_CARD_HEIGHT, scale);
}

export async function rasterizeSvg(
  svgUrl: string,
  width: number,
  height: number,
  scale: number,
): Promise<Blob> {
  const image = await loadImage(svgUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is not available.");

  const draw = () => {
    context.fillStyle = NAME_CARD_BACKGROUND;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  };
  draw();
  for (let attempt = 0; attempt < REDRAW_COUNT; attempt++) {
    await wait(REDRAW_INTERVAL_MS);
    draw();
  }
  return canvasToBlob(canvas);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      // decode()가 없거나 SVG에서 실패하는 브라우저도 있다 — 불러오기만 끝났으면 그린다
      const decoded =
        typeof image.decode === "function"
          ? image.decode().catch(() => undefined)
          : Promise.resolve();
      void decoded.then(() => resolve(image));
    };
    image.onerror = () =>
      reject(new Error("The name card image could not be decoded."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The name card could not be encoded as PNG."));
    }, "image/png");
  });
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

// ─── 파일 ────────────────────────────────────────────────────

/** korean-name-card-hong-gil-dong.png */
export function nameCardFileName(romanization: string): string {
  const slug = romanization
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `korean-name-card${slug ? `-${slug}` : ""}.png`;
}

/** Blob → data URL (도장 PNG를 카드 안에 넣을 때) */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("The image could not be read."));
    reader.readAsDataURL(blob);
  });
}
