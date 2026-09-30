/*
 * 브라우저용 한글 폰트 서브셋 — 같은 출처의 /api/fonts/subset에서 필요한 글자만 담은 폰트를 받는다.
 * 증명서 PDF(react-pdf)와 이름 카드 이미지(html-to-image)가 함께 쓴다.
 *
 * 한글·한자 폰트 원본은 10–20MB라 통째로 쓸 수 없다 — 화면에 나오는 글자만 담으면 수십 KB다.
 * 받은 바이트는 data URL로 돌려준다 (PDF·SVG 이미지 안에 그대로 넣을 수 있게).
 */

export type SubsetFamily = "serif" | "sans";
export type SubsetWeight = 400 | 700;

export interface SubsetFont {
  /** data:font/ttf;base64,… */
  dataUrl: string;
  /** font/ttf · font/otf · font/woff · font/woff2 */
  contentType: string;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export async function fetchSubsetFont(
  family: SubsetFamily,
  weight: SubsetWeight,
  characters: string,
  {
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<SubsetFont> {
  const params = new URLSearchParams({
    family,
    weight: String(weight),
    text: characters,
  });
  const response = await fetchImpl(`/api/fonts/subset?${params}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(
      `Font subset ${family} ${weight} failed: HTTP ${response.status}`,
    );
  }
  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "font/ttf";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    contentType,
    dataUrl: `data:${contentType};base64,${bytesToBase64(bytes)}`,
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/** @font-face src의 format() 값 */
export function fontFormatOf(contentType: string): string {
  switch (contentType) {
    case "font/otf":
      return "opentype";
    case "font/woff":
      return "woff";
    case "font/woff2":
      return "woff2";
    default:
      return "truetype";
  }
}
