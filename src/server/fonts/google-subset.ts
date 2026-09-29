import "server-only";

/*
 * 한글 폰트 서브셋 — 증명서 PDF(react-pdf)에 넣을 글자만 담은 작은 폰트를 Google Fonts에서 받아 온다.
 *
 * 한글·한자 폰트 원본은 10–20MB라 브라우저가 통째로 받기엔 너무 크다. Google Fonts css2 API의
 * text= 매개변수를 쓰면 필요한 글자만 담은 수십 KB짜리 폰트를 받을 수 있다.
 * 요청은 서버가 대신 보낸다 — 이용자의 IP가 Google로 가지 않고, 같은 출처(same-origin)라 CORS·CSP 걱정도 없다.
 */

export const SUBSET_FAMILIES = {
  serif: "Noto Serif KR",
  sans: "Noto Sans KR",
} as const;

export type SubsetFamily = keyof typeof SUBSET_FAMILIES;

export const SUBSET_WEIGHTS = [400, 700] as const;
export type SubsetWeight = (typeof SUBSET_WEIGHTS)[number];

/** 한 번에 담을 수 있는 글자 수 (증명서 하나는 보통 300–450자) */
export const MAX_SUBSET_CHARACTERS = 1200;
const MAX_FONT_BYTES = 8 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;

export interface FontSubset {
  bytes: Uint8Array;
  contentType: "font/ttf" | "font/otf" | "font/woff" | "font/woff2";
}

export class FontSubsetError extends Error {
  constructor(
    readonly status: 400 | 502 | 504,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "FontSubsetError";
  }
}

/** 글자 집합을 정규화한다: NFC, 제어 문자 제거, 중복 제거, 코드 포인트 순 — 같은 집합은 같은 캐시 키가 된다 */
export function normalizeSubsetText(text: string): string {
  const characters = new Set<string>();
  for (const character of text.normalize("NFC")) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code < 0xa0)) continue;
    characters.add(character);
  }
  return [...characters]
    .sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0))
    .join("");
}

export function parseSubsetRequest(params: URLSearchParams): {
  family: SubsetFamily;
  weight: SubsetWeight;
  text: string;
} {
  const family = params.get("family");
  const weight = Number(params.get("weight"));
  const text = normalizeSubsetText(params.get("text") ?? "");

  if (family !== "serif" && family !== "sans") {
    throw new FontSubsetError(400, "family must be serif or sans.");
  }
  if (!(SUBSET_WEIGHTS as readonly number[]).includes(weight)) {
    throw new FontSubsetError(400, "weight must be 400 or 700.");
  }
  if (text === "") throw new FontSubsetError(400, "text is required.");
  if (Array.from(text).length > MAX_SUBSET_CHARACTERS) {
    throw new FontSubsetError(400, "text has too many characters.");
  }
  return { family, weight: weight as SubsetWeight, text };
}

// ─── 캐시 ────────────────────────────────────────────────────

const CACHE_LIMIT_BYTES = 24 * 1024 * 1024;
const cache = new Map<string, FontSubset>();
let cachedBytes = 0;

function remember(key: string, subset: FontSubset) {
  const previous = cache.get(key);
  if (previous) {
    cache.delete(key);
    cachedBytes -= previous.bytes.length;
  }
  cache.set(key, subset);
  cachedBytes += subset.bytes.length;
  // 오래된 것부터 버린다 (Map은 넣은 순서를 기억한다)
  for (const [oldKey, old] of cache) {
    if (cachedBytes <= CACHE_LIMIT_BYTES) break;
    cache.delete(oldKey);
    cachedBytes -= old.bytes.length;
  }
}

// ─── 받아 오기 ───────────────────────────────────────────────

export async function fetchGoogleFontSubset(
  {
    family,
    weight,
    text,
    fetchCache = "no-store",
  }: {
    family: SubsetFamily;
    weight: SubsetWeight;
    text: string;
    /**
     * fetch 캐시. 기본 no-store — 증명서처럼 요청마다 글자가 다르면 Next.js 데이터 캐시에 쌓지 않는다.
     * 빌드 때 한 번 그리는 공유 이미지는 force-cache를 넘겨야 정적 페이지로 미리 만들어진다
     * (no-store fetch는 Next.js가 동적 렌더링 신호로 본다).
     */
    fetchCache?: RequestCache;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<FontSubset> {
  const key = `${family}|${weight}|${text}`;
  const hit = cache.get(key);
  if (hit) {
    // 최근에 쓴 것으로 옮긴다 (크기 합계는 그대로)
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const cssUrl =
    "https://fonts.googleapis.com/css2?family=" +
    `${SUBSET_FAMILIES[family].replace(/ /g, "+")}:wght@${weight}` +
    `&text=${encodeURIComponent(text)}`;

  const css = await request(cssUrl, fetchImpl, "text", fetchCache);
  const fontUrl = extractFontUrl(css);
  const bytes = await request(fontUrl, fetchImpl, "bytes", fetchCache);
  const contentType = detectFontType(bytes);
  if (!contentType) {
    throw new FontSubsetError(
      502,
      "Google Fonts returned an unknown font format.",
    );
  }

  const subset: FontSubset = { bytes, contentType };
  remember(key, subset);
  return subset;
}

/** css2 응답에서 첫 번째 폰트 주소를 꺼낸다 — fonts.gstatic.com만 허용한다 (SSRF 방지) */
export function extractFontUrl(css: string): string {
  const match = /src:\s*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/i.exec(css);
  if (!match)
    throw new FontSubsetError(502, "No font URL in the Google Fonts response.");
  let url: URL;
  try {
    url = new URL(match[1]);
  } catch (error) {
    throw new FontSubsetError(502, "Invalid font URL from Google Fonts.", {
      cause: error,
    });
  }
  if (url.protocol !== "https:" || url.hostname !== "fonts.gstatic.com") {
    throw new FontSubsetError(502, `Unexpected font host: ${url.hostname}`);
  }
  return url.toString();
}

/** 파일 머리 4바이트로 형식을 가린다 */
export function detectFontType(
  bytes: Uint8Array,
): FontSubset["contentType"] | null {
  if (bytes.length < 4) return null;
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (tag === "\u0000\u0001\u0000\u0000" || tag === "true") return "font/ttf";
  if (tag === "OTTO") return "font/otf";
  if (tag === "wOFF") return "font/woff";
  if (tag === "wOF2") return "font/woff2";
  return null;
}

async function request(
  url: string,
  fetchImpl: typeof fetch,
  as: "text",
  cache: RequestCache,
): Promise<string>;
async function request(
  url: string,
  fetchImpl: typeof fetch,
  as: "bytes",
  cache: RequestCache,
): Promise<Uint8Array>;
async function request(
  url: string,
  fetchImpl: typeof fetch,
  as: "text" | "bytes",
  cache: RequestCache,
): Promise<string | Uint8Array> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      // 브라우저가 아닌 요청이라 알려 주면 Google은 TrueType(ttf)으로 준다 — react-pdf가 가장 잘 읽는 형식
      headers: { "User-Agent": "K-Name-Studio-Certificate/1.0" },
      cache,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new FontSubsetError(
      timedOut ? 504 : 502,
      "Google Fonts request failed.",
      {
        cause: error,
      },
    );
  }
  if (!response.ok) {
    throw new FontSubsetError(
      502,
      `Google Fonts responded ${response.status}.`,
    );
  }

  if (as === "text") return response.text();

  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_FONT_BYTES)
    throw new FontSubsetError(502, "Font is too large.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_FONT_BYTES)
    throw new FontSubsetError(502, "Font is too large.");
  return bytes;
}
