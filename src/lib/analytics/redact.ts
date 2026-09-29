/*
 * 분석 도구로 보내기 전에 주소를 비식별화한다.
 *
 * 풀이 주소(/reading/<id>)의 ID는 곧 접근 권한이고, 결제 복귀 주소에는 Stripe 세션 ID가 붙는다.
 * 그대로 GA에 쌓이면 GA 권한을 가진 사람(예: 사이트 인수자)이 남의 유료 풀이를 열 수 있다.
 * 그래서 경로는 템플릿으로 바꾸고, 쿼리는 마케팅 추적용 매개변수만 남긴다.
 */

const KEPT_QUERY_PARAMETERS =
  /^(utm_(source|medium|campaign|term|content|id)|gclid|gbraid|wbraid|fbclid|msclkid|ttclid|ref)$/;

const READING_PATH = /^\/reading\/[^/?#]+/;

/** 경로 → 집계용 묶음 (지표 저장소에도 이 값만 남긴다) */
export type PathGroup = "/" | "/reading/[id]" | "/privacy" | "/terms" | "other";

export function toPathGroup(pathname: string): PathGroup {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "/";
  if (READING_PATH.test(path)) return "/reading/[id]";
  if (path === "/privacy" || path === "/terms") return path;
  return "other";
}

export function redactPath(pathname: string): string {
  return pathname.replace(READING_PATH, "/reading/[id]");
}

/** 전체 URL 비식별화 — 해석할 수 없으면 빈 문자열 */
export function redactUrl(href: string): string {
  if (!href) return "";
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "";
  }
  const kept = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (KEPT_QUERY_PARAMETERS.test(key)) kept.set(key, value);
  });
  const query = kept.toString();
  return `${url.origin}${redactPath(url.pathname)}${query ? `?${query}` : ""}`;
}

/** 풀이 페이지 제목에는 이름이 들어가므로 일반 제목으로 바꿔 보낸다 */
export function safePageTitle(pathname: string, title: string): string {
  return toPathGroup(pathname) === "/reading/[id]"
    ? "Korean name reading"
    : title;
}
