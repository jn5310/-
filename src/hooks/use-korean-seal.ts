import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_SEAL_FONT,
  SEAL_FONTS,
  type SealFontId,
} from "@/components/seal/seal-fonts";
import {
  canvasToPngBlob,
  clearSealCanvas,
  createKoreanSealBlob,
  downloadBlob,
  getSealFileName,
  loadSealFont,
  parseSealText,
  renderKoreanSeal,
  resolveSealOptions,
  type SealFont,
  type SealShape,
} from "@/lib/seal";

export type SealStatus = "idle" | "rendering" | "ready" | "error";

export interface UseKoreanSealOptions {
  /** 사각(기본) 또는 원형 */
  shape?: SealShape;
  /** 출력 해상도(px). 미리보기 캔버스도 이 해상도로 그리므로 다운로드 파일과 똑같다. 기본 1024 */
  size?: number;
  /** 인주 색. 기본 #C8102E */
  color?: string;
  /** 서체 프리셋 이름("brush" | "classic" | "carved") 또는 직접 지정한 폰트 */
  font?: SealFontId | SealFont;
  /** 인주 질감. 기본 true */
  texture?: boolean;
}

export interface UseKoreanSealResult {
  /** 미리보기 <canvas>의 ref에 연결한다 */
  canvasRef: (node: HTMLCanvasElement | null) => void;
  /**
   * idle: 이름이 비었거나 캔버스가 아직 없음 · rendering: 폰트를 받아 그리는 중
   * ready: 다운로드 가능 · error: 입력이 잘못됐거나 그리기에 실패
   */
  status: SealStatus;
  /** 사용자에게 보여 줄 오류 문구 */
  error: string | null;
  /** 정리된 이름 (예: "김민준") — 입력이 올바르지 않으면 null */
  text: string | null;
  /** korean-seal-[name].png */
  fileName: string | null;
  /** 웹 폰트를 불러오지 못해 대체 글꼴로 그렸는지 */
  usedFallbackFont: boolean;
  /** 투명 배경 PNG로 내려받는다 */
  download: () => Promise<void>;
  /** 투명 배경 PNG Blob (공유·업로드용). 캔버스가 없으면 화면 밖에서 새로 그린다 */
  toBlob: () => Promise<Blob>;
}

interface RenderedState {
  key: string;
  error: string | null;
  usedFallbackFont: boolean;
}

/**
 * 한글 이름을 전통 인장으로 그려 미리 보고 내려받는 훅.
 *
 * @example
 * const seal = useKoreanSeal("김민준", { shape: "circle", font: "brush" });
 * <canvas ref={seal.canvasRef} />
 * <button onClick={seal.download} disabled={seal.status !== "ready"}>Download</button>
 */
export function useKoreanSeal(
  name: string,
  options: UseKoreanSealOptions = {},
): UseKoreanSealResult {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState<RenderedState | null>(null);

  const parsed = parseSealText(name);
  const text = parsed.ok ? parsed.text : null;

  const font =
    typeof options.font === "object"
      ? options.font
      : SEAL_FONTS[options.font ?? DEFAULT_SEAL_FONT].font;
  const { shape, size, color, texture } = resolveSealOptions({
    font,
    shape: options.shape,
    size: options.size,
    color: options.color,
    texture: options.texture,
  });
  // effect는 원시값에만 의존시킨다 — 렌더마다 새로 만들어지는 옵션 객체 때문에 다시 그리지 않도록
  const { family, weight } = font;
  const inkSpread = font.inkSpread ?? 0;
  const renderKey =
    text === null
      ? null
      : [text, shape, size, color, texture, family, weight, inkSpread].join(
          "|",
        );

  useEffect(() => {
    if (!canvas) return;
    if (text === null || renderKey === null) {
      clearSealCanvas(canvas);
      return;
    }

    let cancelled = false;
    const sealFont: SealFont = { family, weight, inkSpread };

    // 새길 글자가 든 폰트 조각을 받은 뒤에 그린다 (상태 갱신은 비동기 콜백 안에서만)
    loadSealFont(sealFont, text).then((loaded) => {
      if (cancelled) return;
      try {
        renderKoreanSeal(canvas, Array.from(text), {
          shape,
          size,
          color,
          texture,
          font: sealFont,
        });
        setRendered({ key: renderKey, error: null, usedFallbackFont: !loaded });
      } catch (error) {
        console.error("[useKoreanSeal] render failed", error);
        setRendered({
          key: renderKey,
          error:
            "Your browser couldn’t draw the seal. Please try another browser.",
          usedFallbackFont: !loaded,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    canvas,
    renderKey,
    text,
    shape,
    size,
    color,
    texture,
    family,
    weight,
    inkSpread,
  ]);

  const current = rendered?.key === renderKey ? rendered : null;

  let status: SealStatus;
  if (!parsed.ok) status = parsed.error === "empty" ? "idle" : "error";
  else if (!canvas) status = "idle";
  else if (!current) status = "rendering";
  else status = current.error ? "error" : "ready";

  const error =
    !parsed.ok && parsed.error !== "empty"
      ? parsed.message
      : (current?.error ?? null);
  const fileName = text === null ? null : getSealFileName(text);

  const toBlob = useCallback(async (): Promise<Blob> => {
    if (canvas && status === "ready") return canvasToPngBlob(canvas);
    if (text === null) throw new Error("Enter a name in Hangul first.");
    // 미리보기 캔버스 없이 호출된 경우: 같은 설정으로 화면 밖에서 그린다
    const { blob } = await createKoreanSealBlob(text, {
      font: { family, weight, inkSpread },
      shape,
      size,
      color,
      texture,
    });
    return blob;
  }, [
    canvas,
    status,
    text,
    family,
    weight,
    inkSpread,
    shape,
    size,
    color,
    texture,
  ]);

  const download = useCallback(async () => {
    if (!fileName) return;
    downloadBlob(await toBlob(), fileName);
  }, [fileName, toBlob]);

  return {
    canvasRef: setCanvas,
    status,
    error,
    text,
    fileName,
    usedFallbackFont: current?.usedFallbackFont ?? false,
    download,
    toBlob,
  };
}
