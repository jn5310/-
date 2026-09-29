import "server-only";

import { describeError, logEvent } from "@/server/log";
import { confirmCheckoutReturn } from "@/server/payments/fulfillment";
import type { ReadingView } from "@/types/reading";

import { loadReading, toFreeView, toReadingView } from "./repository";

/**
 * 풀이를 권한에 맞는 모양으로 읽는다 (없으면 null).
 *
 * sessionId(결제 복귀 URL의 session_id)가 있고 아직 무료 상태면 Stripe에서 결제를 직접 확인해 연다.
 * 웹훅이 늦게 와도 사용자는 돌아오자마자 결과를 본다. 확인이 안 되면 payment: "processing"을 붙여
 * 화면이 잠시 뒤 다시 조회하게 한다.
 */
export async function getReadingView(
  id: string,
  { sessionId }: { sessionId?: string | null } = {},
): Promise<ReadingView | null> {
  const loaded = await loadReading(id);
  if (!loaded) return null;
  if (loaded.entitlement || !sessionId) {
    return toReadingView(loaded.reading, loaded.entitlement);
  }

  try {
    const outcome = await confirmCheckoutReturn(id, sessionId);
    logEvent("readings", "info", {
      event: "checkout-return",
      readingId: id,
      outcome: outcome.status,
    });

    if (
      outcome.status === "unlocked" ||
      outcome.status === "already-unlocked"
    ) {
      const reloaded = await loadReading(id);
      if (reloaded)
        return toReadingView(reloaded.reading, reloaded.entitlement);
    }
    if (outcome.status === "pending") {
      return toFreeView(loaded.reading, { payment: "processing" });
    }
    if (outcome.status === "reading-missing") {
      logEvent("readings", "error", {
        event: "paid-reading-missing",
        readingId: id,
      });
    }
  } catch (error) {
    // Stripe 확인에 실패해도 웹훅이 열어 준다 — 화면은 조금 뒤 다시 조회한다
    logEvent("readings", "warn", {
      event: "checkout-confirm-failed",
      readingId: id,
      ...describeError(error),
    });
    return toFreeView(loaded.reading, { payment: "processing" });
  }

  return toFreeView(loaded.reading);
}
