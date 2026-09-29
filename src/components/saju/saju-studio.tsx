"use client";

import { useEffect, useRef, useState } from "react";

import type { BirthFormValues } from "@/types/name";
import type { SajuResult } from "@/types/saju";

import { SajuForm } from "./saju-form";
import { SajuResultView } from "./saju-result";

/**
 * 사주 분석: 입력 폼 → 결과. 결과를 보는 동안에도 입력값을 기억해 두어 "다시 보기"에서 고쳐 쓸 수 있다.
 * 결과는 서버에 저장하지 않는다 (새로 고침하면 다시 입력한다).
 */
export function SajuStudio() {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [values, setValues] = useState<BirthFormValues | undefined>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  const hasShownResult = useRef(false);

  // 화면이 바뀌면 새 내용의 맨 위로 옮긴다 — 결과는 제목에 포커스, 다시 입력은 폼 위치로
  useEffect(() => {
    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "auto"
      : "smooth";
    if (result) {
      hasShownResult.current = true;
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ behavior, block: "start" });
    } else if (hasShownResult.current) {
      formTopRef.current?.scrollIntoView({ behavior, block: "start" });
    }
  }, [result]);

  if (result) {
    return (
      <SajuResultView
        result={result}
        headingRef={headingRef}
        onReset={() => setResult(null)}
      />
    );
  }

  return (
    <div
      ref={formTopRef}
      className="mx-auto w-full max-w-3xl scroll-mt-24 rounded-[2rem] border border-ink/10 bg-white/60 p-6 shadow-xl shadow-ink/5 backdrop-blur-sm sm:p-10"
    >
      <SajuForm
        defaultValues={values}
        onResult={(next, submitted) => {
          setValues(submitted);
          setResult(next);
        }}
      />
    </div>
  );
}
