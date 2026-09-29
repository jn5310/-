"use client";

import { useState } from "react";

import { secondaryButtonClass } from "@/components/ui/styles";
import type { CertificateInput } from "@/lib/certificate/content";
import { cn } from "@/lib/cn";
import { downloadBlob } from "@/lib/seal";

type Status = "idle" | "working" | "error";

interface CertificateButtonProps extends Omit<CertificateInput, "issuedAt"> {
  /** 잠금 해제(결제) 시각 ISO 문자열 — 증명서 발급일로 쓴다 */
  issuedAt: string;
  className?: string;
}

/**
 * 프리미엄: 공식 한국어 이름 증명서 PDF 내려받기.
 * PDF는 브라우저에서 바로 만든다 — 생성 코드(react-pdf)는 버튼을 누를 때 불러온다.
 */
export function CertificateButton({
  issuedAt,
  className,
  ...input
}: CertificateButtonProps) {
  const [status, setStatus] = useState<Status>("idle");

  const handleClick = async () => {
    setStatus("working");
    try {
      const { createCertificate } =
        await import("@/components/certificate/create-certificate");
      const file = await createCertificate({
        ...input,
        issuedAt: new Date(issuedAt),
      });
      downloadBlob(file.blob, file.fileName);
      setStatus("idle");
    } catch (error) {
      console.error("[CertificateButton] certificate failed", error);
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
          증명서 받기
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
