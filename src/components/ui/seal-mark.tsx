import { cn } from "@/lib/cn";

/** 낙관(落款) 도장 모티프 로고 — 名(이름 명). 크기·글자 크기는 className으로 정한다. */
export function SealMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      lang="ko"
      className={cn(
        "inline-grid shrink-0 -rotate-3 place-items-center rounded-[22%] bg-vermilion font-serif leading-none font-bold text-hanji shadow-[inset_0_0_0_2px_rgb(255_255_255/0.22)]",
        className,
      )}
    >
      名
    </span>
  );
}
