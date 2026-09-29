import {
  fetchGoogleFontSubset,
  FontSubsetError,
  parseSubsetRequest,
} from "@/server/fonts/google-subset";
import { describeError, logEvent } from "@/server/log";

/**
 * GET /api/fonts/subset?family=serif|sans&weight=400|700&text=…
 *
 * 증명서 PDF(react-pdf)가 쓰는 한글·한자 폰트 서브셋. 주소가 곧 내용이라 1년 동안 캐시한다.
 */

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  // 다른 사이트가 무료 폰트 프록시로 쓰지 못하게 한다 (브라우저가 붙이는 Fetch Metadata 헤더)
  const site = request.headers.get("sec-fetch-site");
  if (
    site &&
    site !== "same-origin" &&
    site !== "same-site" &&
    site !== "none"
  ) {
    return new Response("Forbidden\n", { status: 403 });
  }

  try {
    const params = parseSubsetRequest(new URL(request.url).searchParams);
    const subset = await fetchGoogleFontSubset(params);
    return new Response(new Uint8Array(subset.bytes), {
      headers: {
        "Content-Type": subset.contentType,
        "Content-Length": String(subset.bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof FontSubsetError ? error.status : 500;
    if (status >= 500) {
      logEvent("api/fonts/subset", "error", describeError(error));
    }
    return new Response(
      `${error instanceof FontSubsetError ? error.message : "Font subset failed."}\n`,
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
