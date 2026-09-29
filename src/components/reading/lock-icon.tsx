import { cn } from "@/lib/cn";

/** 자물쇠 아이콘 (장식용) */
export function LockIcon({ className }: { className?: string }) {
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
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}
