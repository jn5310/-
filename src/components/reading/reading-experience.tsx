"use client";

import { useEffect, useState } from "react";

import { fetchReading } from "@/lib/api/client";
import type { ReadingView } from "@/types/reading";

import { FreeReading, type FreeReadingNotice } from "./free-reading";
import { PremiumReading } from "./premium-reading";

/** 결제 확정을 기다리는 동안 다시 조회하는 간격과 최대 대기 시간 */
const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 60_000;

interface ReadingExperienceProps {
  /** 서버가 권한을 확인해 만든 첫 화면 (결제 복귀면 이미 Stripe 확인을 거쳤다) */
  initialView: ReadingView;
  /** Stripe에서 돌아온 경우: success_url · cancel_url */
  checkout: "success" | "cancelled" | null;
  sessionId: string | null;
}

/**
 * 풀이 화면의 상태 관리.
 * 결제를 마치고 돌아왔는데 아직 잠겨 있으면(웹훅 지연·지연 결제 수단) 잠시 동안 다시 조회해 자동으로 연다.
 */
export function ReadingExperience({
  initialView,
  checkout,
  sessionId,
}: ReadingExperienceProps) {
  const [view, setView] = useState(initialView);
  const [justUnlocked, setJustUnlocked] = useState(
    initialView.tier === "premium" && checkout === "success",
  );
  const [timedOut, setTimedOut] = useState(false);

  const isWaitingForPayment = view.tier === "free" && checkout === "success";

  // 결제 결과를 반영한 뒤에는 주소의 ?checkout·session_id를 지운다 — 새로고침·공유 때 안내가 반복되지 않게
  useEffect(() => {
    if (checkout && (view.tier === "premium" || checkout === "cancelled")) {
      window.history.replaceState(null, "", `/reading/${view.readingId}`);
    }
  }, [checkout, view.tier, view.readingId]);

  useEffect(() => {
    if (!isWaitingForPayment) return;

    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: number | undefined;

    const poll = async () => {
      try {
        const response = await fetchReading(view.readingId, {
          sessionId,
          signal: controller.signal,
        });
        if (response.ok && response.data.tier === "premium") {
          setView(response.data);
          setJustUnlocked(true);
          return;
        }
      } catch {
        return; // 화면을 떠나 취소됨
      }
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isWaitingForPayment, view.readingId, sessionId]);

  if (view.tier === "premium") {
    return <PremiumReading view={view} justUnlocked={justUnlocked} />;
  }

  let notice: FreeReadingNotice | null = null;
  if (checkout === "cancelled") notice = "cancelled";
  else if (isWaitingForPayment)
    notice = timedOut ? "confirm-timeout" : "confirming";

  return <FreeReading view={view} notice={notice} />;
}
