import { z } from "zod";

import { readBodyBytes } from "@/server/http";
import { pageViewContext, recordPageView, requestHost } from "@/server/metrics";
import { isBot } from "@/server/metrics/visitor";

/**
 * POST /api/metrics/collect — 자체 방문 지표 (브라우저 sendBeacon, text/plain JSON 본문).
 *
 * 쿠키를 쓰지 않고 IP·전체 주소를 저장하지 않는다 — 날짜별 합계와 하루짜리 익명 해시만 남는다.
 * 봇·미리 불러오기·다른 사이트에서 온 요청은 세지 않는다.
 * 무엇을 걸러 냈는지 알려 주지 않도록 항상 204를 돌려준다.
 */

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2 * 1024;

const payloadSchema = z.object({
  path: z.string().min(1).max(512).startsWith("/"),
  entry: z.boolean().optional(),
  referrer: z.string().max(2048).optional(),
  utmSource: z.string().max(100).optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    if (isCountable(request)) {
      const bytes = await readBodyBytes(
        request,
        MAX_BODY_BYTES,
        request.signal,
      );
      const parsed = payloadSchema.safeParse(
        JSON.parse(new TextDecoder().decode(bytes)),
      );
      if (parsed.success) recordPageView(parsed.data, pageViewContext(request));
    }
  } catch {
    // 잘못된 본문·너무 큰 본문·끊긴 연결은 조용히 버린다
  }
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

function isCountable(request: Request): boolean {
  const { headers } = request;
  if (isBot(headers.get("user-agent") ?? "")) return false;

  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`;
  if (/prefetch|prerender/i.test(purpose)) return false;

  // 이 사이트의 페이지가 보낸 요청만 센다
  const site = headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  // Sec-Fetch-*를 보내지 않는 오래된 브라우저: Origin이 이 사이트인지 본다
  const origin = headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host.toLowerCase() === requestHost(request);
  } catch {
    return false;
  }
}
