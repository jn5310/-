import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/* 공유 버튼 아이콘 (장식용) */

function Icon({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className ?? "size-4")}
    >
      {children}
    </svg>
  );
}

export function DownloadIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  );
}

export function ShareIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </Icon>
  );
}

export function LinkIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </Icon>
  );
}
