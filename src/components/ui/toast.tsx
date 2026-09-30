"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/*
 * 가벼운 토스트 알림 — "링크를 복사했어요" 같은 짧은 안내.
 * 알림 영역(aria-live)은 늘 DOM에 두고 내용만 바꿔 화면 읽기 프로그램이 새 문구를 읽게 한다.
 */

export interface ToastMessage {
  id: number;
  text: string;
  tone: "info" | "error";
}

export function useToast(durationMs = 2800) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);

  const show = useCallback(
    (text: string, tone: ToastMessage["tone"] = "info") => {
      window.clearTimeout(timer.current);
      counter.current += 1;
      setToast({ id: counter.current, text, tone });
      timer.current = window.setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  // 화면을 떠나면 남은 타이머를 지운다
  useEffect(() => {
    const pending = timer;
    return () => window.clearTimeout(pending.current);
  }, []);

  return { toast, show };
}

export function Toast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:bottom-8"
    >
      {toast ? (
        <p
          key={toast.id}
          className={cn(
            "max-w-md rounded-full px-5 py-3 text-center text-sm font-medium text-hanji shadow-xl shadow-ink/20 motion-safe:animate-rise",
            toast.tone === "error" ? "bg-vermilion-deep" : "bg-ink",
          )}
        >
          {toast.text}
        </p>
      ) : null}
    </div>
  );
}
