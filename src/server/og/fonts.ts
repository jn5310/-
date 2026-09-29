import "server-only";

import { unstable_rethrow } from "next/navigation";

import { describeError, logEvent } from "@/server/log";
import {
  fetchGoogleFontSubset,
  normalizeSubsetText,
} from "@/server/fonts/google-subset";

/** next/og(ImageResponse)에 넘길 폰트 */
export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

export const OG_FONT_FAMILY = "Noto Serif KR";

/** 기본 라틴 문자 — 영문 문구가 바뀌어도 글자가 빠지지 않게 늘 담는다 */
const LATIN = Array.from({ length: 0x7e - 0x20 + 1 }, (_, index) =>
  String.fromCharCode(0x20 + index),
).join("");

/**
 * 가변 폰트(fvar 표가 있는 폰트)인지 — Satori(opentype.js)는 가변 폰트를 읽다 멈춘다.
 * TTF·OTF(sfnt)와 WOFF의 표 목록에서 fvar를 찾는다. 읽을 수 없는 파일도 쓰지 않는다(true).
 */
export function isVariableFont(bytes: Uint8Array): boolean {
  const tagAt = (offset: number) =>
    String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
  const woff = bytes.length >= 4 && tagAt(0) === "wOFF";
  const directory = woff ? 44 : 12;
  const entrySize = woff ? 20 : 16;
  if (bytes.length < directory) return true;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tableCount = view.getUint16(woff ? 12 : 4);
  for (let index = 0; index < tableCount; index++) {
    const offset = directory + index * entrySize;
    if (offset + 4 > bytes.length) return true;
    if (tagAt(offset) === "fvar") return true;
  }
  return false;
}

/**
 * 공유 이미지에 쓸 Noto Serif KR 서브셋 (400 · 700).
 * 공유 이미지를 그리는 Satori는 WOFF2와 가변 폰트를 읽지 못하므로 정적 TTF·OTF·WOFF만 쓴다.
 * 받지 못하면 빈 배열 — 호출한 쪽은 한글 없는 디자인으로 그린다 (빌드가 실패하지 않게).
 */
export async function loadOgFonts(text: string): Promise<OgFont[]> {
  const characters = normalizeSubsetText(`${LATIN}${text}`);
  try {
    const subsets = await Promise.all(
      ([400, 700] as const).map(async (weight) => ({
        weight,
        subset: await fetchGoogleFontSubset({
          family: "serif",
          weight,
          text: characters,
          // 빌드 때 한 번 받아 정적 이미지로 굳힌다 (no-store면 공유 이미지가 요청마다 다시 그려진다)
          fetchCache: "force-cache",
        }),
      })),
    );
    if (
      subsets.some(
        ({ subset }) =>
          subset.contentType === "font/woff2" || isVariableFont(subset.bytes),
      )
    ) {
      logEvent("og", "warn", { event: "font-subset-unusable" });
      return [];
    }
    return subsets.map(({ weight, subset }) => ({
      name: OG_FONT_FAMILY,
      data: new Uint8Array(subset.bytes).buffer,
      weight,
      style: "normal",
    }));
  } catch (error) {
    // Next.js가 흐름 제어에 쓰는 오류(동적 렌더링 전환 등)는 삼키지 않고 다시 던진다
    unstable_rethrow(error);
    logEvent("og", "warn", {
      event: "font-subset-failed",
      ...describeError(error),
    });
    return [];
  }
}
