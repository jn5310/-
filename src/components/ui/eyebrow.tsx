import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface EyebrowProps {
  hangul: string;
  children: ReactNode;
  className?: string;
}

/** 섹션 머리 문구 — 한국어와 영어를 나란히 적는다 */
export function Eyebrow({ hangul, children, className }: EyebrowProps) {
  return (
    <p
      className={cn(
        "inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tracking-[0.2em] text-vermilion uppercase",
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-8 bg-current" />
      <span lang="ko" className="tracking-[0.12em]">
        {hangul}
      </span>
      <span aria-hidden="true" className="text-vermilion/40">
        ·
      </span>
      <span>{children}</span>
    </p>
  );
}
