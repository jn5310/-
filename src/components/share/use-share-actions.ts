"use client";

import { useCallback, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/track";
import {
  copyText,
  shareOrCopy,
  type SharePayload,
  type ShareResult,
} from "@/lib/share";

/** GA4 share 이벤트의 content_type */
export type ShareContentType = "name_card" | "saju_reading";

/**
 * 공유 · 링크 복사 버튼의 동작 — 결과를 토스트로 알리고 GA4 share 이벤트를 보낸다.
 * 자동 복사가 막힌 환경이면 linkVisible이 켜진다 — 링크 입력칸을 보여 직접 복사하게 한다.
 */
export function useShareActions(contentType: ShareContentType) {
  const { toast, show } = useToast();
  const [linkVisible, setLinkVisible] = useState(false);

  const track = useCallback(
    (method: string) => {
      trackEvent(ANALYTICS_EVENTS.share, {
        method,
        content_type: contentType,
        item_id: contentType,
      });
    },
    [contentType],
  );

  /**
   * 공유 창을 연다 (없으면 링크 복사). 클릭 처리기에서 다른 await 없이 바로 불러야 한다 —
   * 사파리는 클릭 뒤 비동기 작업을 거친 공유를 막는다.
   */
  const share = useCallback(
    async (payload: SharePayload): Promise<ShareResult> => {
      const result = await shareOrCopy(payload);
      if (result.outcome === "shared") {
        track(result.method);
      } else if (result.outcome === "copied") {
        track("copy_link");
        show("Link copied! Paste it anywhere to share.");
      } else if (result.outcome === "failed") {
        setLinkVisible(true);
        show("Sharing isn’t available here — copy the link below.", "error");
      }
      return result;
    },
    [show, track],
  );

  const copyLink = useCallback(
    async (url: string): Promise<boolean> => {
      if (await copyText(url)) {
        track("copy_link");
        show("Link copied!");
        return true;
      }
      setLinkVisible(true);
      show("Couldn’t copy automatically — the link is below.", "error");
      return false;
    },
    [show, track],
  );

  return { toast, show, linkVisible, share, copyLink };
}
