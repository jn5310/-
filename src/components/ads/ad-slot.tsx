"use client";

import { useEffect, useRef } from "react";

import { ADSENSE_CLIENT_ID, AD_SLOTS, type AdPlacement } from "@/lib/ads";
import { cn } from "@/lib/cn";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

/**
 * AdSense 디스플레이 광고 한 칸 (반응형).
 *
 * - 스크립트는 광고를 그리는 화면에서만 불러온다 — 결제한 풀이 화면에는 광고 코드 자체가 없다.
 *   (React 19는 async <script>를 <head>로 옮기고 중복을 없앤다.)
 * - 광고가 뜰 자리를 미리 잡아 레이아웃 이동(CLS)을 막고, 채워지지 않으면 자리째 숨긴다(globals.css).
 * - 개발 환경에서는 data-adtest="on"으로 테스트 광고만 요청해 무효 노출을 만들지 않는다.
 */
export function AdSlot({ placement, className }: AdSlotProps) {
  const clientId = ADSENSE_CLIENT_ID;
  const slot = AD_SLOTS[placement];
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const ins = insRef.current;
    // StrictMode의 이중 실행·재마운트에서 같은 칸을 두 번 채우면 AdSense가 TagError를 던진다
    if (!clientId || !slot || !ins || pushed.current) return;
    if (ins.dataset.adsbygoogleStatus) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch (error) {
      console.warn("[AdSlot] adsbygoogle.push failed", error);
    }
  }, [clientId, slot]);

  if (!clientId || !slot) {
    return process.env.NODE_ENV === "development" ? (
      <div
        className={cn(
          "mx-auto grid min-h-24 w-full max-w-4xl place-items-center rounded-2xl border border-dashed border-ink/20 px-4 text-center text-xs text-ink-muted",
          className,
        )}
      >
        Ad slot “{placement}” — set NEXT_PUBLIC_ADSENSE_CLIENT_ID and
        NEXT_PUBLIC_ADSENSE_SLOT_{placement.toUpperCase()} to show AdSense
        (visible only in development)
      </div>
    ) : null;
  }

  return (
    <aside
      aria-label="Advertisement"
      className={cn(
        "mx-auto w-full max-w-4xl has-[[data-ad-status=unfilled]]:hidden",
        className,
      )}
    >
      <script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
      />
      {/* 광고임을 분명히 표시해 콘텐츠·버튼으로 오인한 클릭을 줄인다 */}
      <p className="mb-2 text-center text-[0.65rem] font-semibold tracking-[0.2em] text-ink-muted uppercase">
        Advertisement
      </p>
      <ins
        ref={insRef}
        className="adsbygoogle block min-h-[250px]"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(process.env.NODE_ENV === "production"
          ? {}
          : { "data-adtest": "on" })}
      />
    </aside>
  );
}
