"use client";

import { useState } from "react";

import { secondaryButtonClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { downloadBlob, type SealFont, type SealShape } from "@/lib/seal";
import type { GeneratedName } from "@/types/api";
import type { FiveElement, SajuReading } from "@/types/saju";

interface CertificateButtonProps {
  readingId: string;
  englishName: string;
  name: GeneratedName;
  favorableElements: FiveElement[];
  dayMaster: SajuReading["dayMaster"];
  /** 결제(잠금 해제) 시각 — 증서 발급일로 쓴다 */
  issuedAt: string;
  /** 화면에서 고른 도장 모양·서체를 증서에도 찍는다 */
  sealShape: SealShape;
  sealFont: SealFont;
  className?: string;
}

/** 프리미엄: 이름 증서 PDF 내려받기 (PDF 생성 코드는 누를 때 불러온다) */
export function CertificateButton({
  readingId,
  englishName,
  name,
  favorableElements,
  dayMaster,
  issuedAt,
  sealShape,
  sealFont,
  className,
}: CertificateButtonProps) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  const handleClick = async () => {
    setStatus("working");
    try {
      const { createCertificatePdf, getCertificateFileName } =
        await import("@/lib/certificate");
      const blob = await createCertificatePdf({
        englishName,
        name,
        favorableElements,
        dayMaster,
        certificateId: readingId,
        issuedAt: new Date(issuedAt),
        seal: { shape: sealShape, font: sealFont },
      });
      downloadBlob(blob, getCertificateFileName(name.romanization));
      setStatus("idle");
    } catch (error) {
      console.error("[CertificateButton] PDF failed", error);
      setStatus("error");
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "working"}
        aria-busy={status === "working" || undefined}
        className={cn(
          secondaryButtonClass,
          "disabled:cursor-wait disabled:opacity-60",
        )}
      >
        {status === "working"
          ? "Preparing your certificate…"
          : "Download certificate (PDF)"}
        <span
          aria-hidden="true"
          lang="ko"
          className="font-serif font-normal text-ink-muted"
        >
          증서 받기
        </span>
      </button>
      <p
        role="alert"
        className={cn(
          "text-sm text-vermilion",
          status === "error" ? "" : "sr-only",
        )}
      >
        {status === "error"
          ? "The certificate couldn’t be created. Please try again."
          : ""}
      </p>
    </div>
  );
}
