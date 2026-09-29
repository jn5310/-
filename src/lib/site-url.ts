/*
 * 정식 사이트 주소 — canonical · OpenGraph · sitemap · robots · JSON-LD가 모두 이 값을 쓴다.
 *
 * 1. APP_URL (예: https://kname.studio) — 운영에서는 꼭 지정한다 (Stripe 결제 복귀 주소와 같은 값)
 * 2. Vercel 운영 배포: VERCEL_PROJECT_PRODUCTION_URL (연결한 도메인 또는 *.vercel.app)
 * 3. Vercel 미리보기 배포: VERCEL_URL
 * 4. 로컬: http://localhost:3000
 */

type Env = Record<string, string | undefined>;

export function getSiteUrl(env: Env = process.env): URL {
  const candidates = [
    env.APP_URL,
    env.VERCEL_ENV === "production"
      ? withHttps(env.VERCEL_PROJECT_PRODUCTION_URL)
      : undefined,
    withHttps(env.VERCEL_URL),
  ];
  for (const candidate of candidates) {
    const url = parseOrigin(candidate);
    if (url) return url;
  }
  return new URL(`http://localhost:${env.PORT?.trim() || "3000"}`);
}

/**
 * 검색 엔진에 노출할 배포인지 — Vercel 미리보기·개발 서버는 색인하지 않는다
 * (같은 내용이 여러 주소에 올라가 중복 문서로 보이는 것을 막는다).
 */
export function isProductionSite(env: Env = process.env): boolean {
  if (env.VERCEL_ENV) return env.VERCEL_ENV === "production";
  return env.NODE_ENV === "production";
}

/** 사이트 주소 기준 절대 URL */
export function absoluteUrl(path: string, env: Env = process.env): string {
  return new URL(path, getSiteUrl(env)).href;
}

function withHttps(host: string | undefined): string | undefined {
  const value = host?.trim();
  return value ? `https://${value.replace(/^https?:\/\//, "")}` : undefined;
}

function parseOrigin(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? new URL(url.origin)
      : null;
  } catch {
    return null;
  }
}
