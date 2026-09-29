"use client";

import { useState } from "react";

import { primaryButtonClass } from "@/components/ui/styles";
import {
  useKoreanSeal,
  type UseKoreanSealOptions,
} from "@/hooks/use-korean-seal";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/track";
import { cn } from "@/lib/cn";
import { clampSealSize, DEFAULT_SEAL_SIZE } from "@/lib/seal";

export interface KoreanSealProps extends UseKoreanSealOptions {
  /** 도장에 새길 한글 이름 (1–4자, 예: "김민준", "민준") */
  name: string;
  /** 다운로드 버튼 표시 여부. 기본 true */
  showDownload?: boolean;
  /**
   * 이름 형식 오류를 미리보기 아래에 표시할지. 기본 true.
   * 입력창 옆에 이미 오류를 보여 준다면 false로 두어 같은 문구가 두 번 나오지 않게 한다.
   */
  showInputError?: boolean;
  /** 그리기가 끝났을 때 미리보기 아래 문구. 기본 "Transparent PNG · 1024 × 1024px" */
  readyMessage?: string;
  className?: string;
}

/**
 * 전통 인장 미리보기 + 투명 PNG 다운로드.
 * 미리보기 캔버스를 출력 해상도(기본 1024px)로 그려 화면과 파일이 똑같다.
 */
export function KoreanSeal({
  name,
  showDownload = true,
  showInputError = true,
  readyMessage,
  className,
  ...options
}: KoreanSealProps) {
  // 결과를 풀어 쓴다 — 콜백 ref(canvasRef)와 같은 객체에서 status·text를 읽으면
  // React Compiler 규칙(react-hooks/refs)이 객체 전체를 ref로 보고 렌더링 중 읽기를 막는다
  const { canvasRef, status, error, text, usedFallbackFont, download } =
    useKoreanSeal(name, options);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const size = clampSealSize(options.size ?? DEFAULT_SEAL_SIZE);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await download();
      trackEvent(ANALYTICS_EVENTS.sealDownload, {
        shape: options.shape ?? "square",
      });
    } catch (error) {
      console.error("[KoreanSeal] download failed", error);
      setDownloadError("The download didn’t start. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // 이름 형식 오류는 text가 null일 때만 생긴다 — 그리기 실패 오류는 항상 보여 준다
  const sealError = text === null && !showInputError ? null : error;
  const message =
    sealError ??
    downloadError ??
    (usedFallbackFont
      ? "The seal font couldn’t load, so a system font was used."
      : null);

  return (
    <figure className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative aspect-square w-full max-w-80 rounded-3xl border border-ink/10 bg-white p-5 shadow-inner shadow-ink/5">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          role="img"
          aria-label={
            text
              ? `Traditional Korean seal carved with ${text}`
              : "Korean seal preview"
          }
          className={cn(
            "size-full transition-opacity duration-300",
            status === "ready" ? "opacity-100" : "opacity-30",
          )}
        />
        {text === null ? (
          <span
            aria-hidden="true"
            lang="ko"
            className="absolute inset-0 grid place-items-center font-serif text-6xl text-ink/10"
          >
            印
          </span>
        ) : null}
      </div>

      <figcaption className="flex flex-col items-center gap-3 text-center">
        <p
          aria-live="polite"
          className={cn(
            "min-h-5 text-sm",
            sealError || downloadError ? "text-vermilion" : "text-ink-muted",
          )}
        >
          {message ??
            (status === "ready"
              ? (readyMessage ?? `Transparent PNG · ${size} × ${size}px`)
              : status === "rendering"
                ? "Carving your seal…"
                : "")}
        </p>

        {showDownload ? (
          <button
            type="button"
            onClick={handleDownload}
            disabled={status !== "ready" || isDownloading}
            className={primaryButtonClass}
          >
            Download PNG
            <span
              aria-hidden="true"
              lang="ko"
              className="font-serif font-normal text-hanji/60"
            >
              도장 받기
            </span>
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
