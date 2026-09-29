"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requestCheckout } from "@/lib/api/client";
import {
  ANALYTICS_EVENTS,
  getGaIdentifiers,
  premiumEcommerce,
  trackEvent,
} from "@/lib/analytics/track";

/** 어느 결제 버튼을 눌렀는지 — GA4에서 버튼별 전환율을 비교한다 */
export type CheckoutPlacement =
  "paywall_card" | "locked_name" | "locked_section";

export interface CheckoutControls {
  /** Stripe Checkout(결제 페이지)으로 이동한다 */
  start: (placement: CheckoutPlacement) => void;
  /** 결제 페이지 URL을 받는 중이거나 이동하는 중 */
  isRedirecting: boolean;
  error: string | null;
}

/** 페이월의 모든 결제 버튼이 같은 상태를 공유하도록 풀이 화면에서 한 번만 만든다 */
export function useCheckout(readingId: string): CheckoutControls {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  // Stripe 결제 페이지에서 '뒤로'를 누르면 브라우저가 이 페이지를 캐시(bfcache)에서 되살린다 —
  // 버튼이 '이동 중' 상태로 굳지 않게 풀어 준다
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        busy.current = false;
        setIsRedirecting(false);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const start = useCallback(
    (placement: CheckoutPlacement) => {
      if (busy.current) return; // 두 번 눌러 세션이 둘 생기지 않게
      busy.current = true;
      setError(null);
      setIsRedirecting(true);

      trackEvent(ANALYTICS_EVENTS.beginCheckout, {
        ...premiumEcommerce(),
        placement,
      });

      void getGaIdentifiers()
        .then((analytics) => requestCheckout(readingId, { analytics }))
        .then((response) => {
          if (response.ok) {
            window.location.assign(response.data.url);
            return; // 페이지를 떠날 때까지 '이동 중'을 유지한다
          }
          if (
            response.error.code === "ALREADY_UNLOCKED" ||
            response.error.code === "PAYMENTS_DISABLED"
          ) {
            // 다른 탭에서 이미 결제했거나, 그사이 무료 개방으로 바뀌었다 — 열린 풀이를 다시 읽는다
            window.location.reload();
            return;
          }
          busy.current = false;
          setIsRedirecting(false);
          setError(response.error.message);
        })
        .catch(() => {
          busy.current = false;
          setIsRedirecting(false);
          setError("Checkout couldn’t start. Please try again.");
        });
    },
    [readingId],
  );

  return { start, isRedirecting, error };
}
