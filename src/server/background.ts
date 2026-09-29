import "server-only";

import { after } from "next/server";

import { describeError, logEvent } from "./log";

/**
 * 응답을 보낸 뒤에 할 일 (지표 기록 등) — 사용자는 기다리지 않는다.
 * Next.js after()는 Vercel에서 함수가 작업을 마칠 때까지 살아 있게 한다(waitUntil).
 * 요청 밖(테스트·스크립트)에서는 after()를 쓸 수 없으므로 바로 실행한다.
 */
export function runAfterResponse(task: () => Promise<unknown>): void {
  const run = () =>
    task().catch((error) => {
      logEvent("background", "warn", describeError(error));
    });
  try {
    after(run);
  } catch {
    void run();
  }
}
