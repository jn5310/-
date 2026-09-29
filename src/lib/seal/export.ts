import {
  clampSealSize,
  DEFAULT_SEAL_SHAPE,
  DEFAULT_SEAL_SIZE,
  SEAL_INK_COLOR,
} from "./constants";
import { loadSealFont } from "./fonts";
import { renderKoreanSeal } from "./render";
import { parseSealText } from "./text";
import type { SealFont, SealRenderOptions, SealShape } from "./types";

export interface SealExportOptions {
  font: SealFont;
  shape?: SealShape;
  size?: number;
  color?: string;
  texture?: boolean;
}

/** 다운로드 파일 이름: korean-seal-[name].png */
export function getSealFileName(text: string): string {
  return `korean-seal-${text}.png`;
}

export function resolveSealOptions({
  font,
  shape = DEFAULT_SEAL_SHAPE,
  size = DEFAULT_SEAL_SIZE,
  color = SEAL_INK_COLOR,
  texture = true,
}: SealExportOptions): SealRenderOptions {
  return { font, shape, size: clampSealSize(size), color, texture };
}

/** 캔버스를 투명 배경 PNG Blob으로 인코딩한다 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The seal could not be encoded as PNG."));
    }, "image/png");
  });
}

/** Blob을 파일로 내려받는다 (임시 <a download> 방식) */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Safari는 클릭 직후 URL을 해제하면 다운로드가 끊길 수 있어 잠시 뒤에 해제한다
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * 화면에 붙이지 않은 캔버스로 도장을 그려 PNG Blob을 만든다.
 * 미리보기 없이 바로 내려받거나 서버로 업로드할 때 쓴다.
 */
export async function createKoreanSealBlob(
  name: string,
  options: SealExportOptions,
): Promise<{ blob: Blob; fileName: string }> {
  const parsed = parseSealText(name);
  if (!parsed.ok) throw new Error(parsed.message);

  const resolved = resolveSealOptions(options);
  await loadSealFont(resolved.font, parsed.text);

  const canvas = document.createElement("canvas");
  renderKoreanSeal(canvas, parsed.characters, resolved);
  return {
    blob: await canvasToPngBlob(canvas),
    fileName: getSealFileName(parsed.text),
  };
}

/** 이름만 넘기면 도장 PNG를 바로 내려받는다 */
export async function downloadKoreanSeal(
  name: string,
  options: SealExportOptions,
): Promise<void> {
  const { blob, fileName } = await createKoreanSealBlob(name, options);
  downloadBlob(blob, fileName);
}
