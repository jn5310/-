import { getAdsTxtLine } from "@/lib/ads";

/**
 * GET /ads.txt — AdSense 게시자 인증 파일.
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID(ca-pub-…)로 만든다. 설정하지 않았으면 404.
 */
export function GET(): Response {
  const line = getAdsTxtLine();
  if (!line) return new Response("Not found\n", { status: 404 });
  return new Response(`${line}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
