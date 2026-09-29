/** 운영 로그(JSON 한 줄) — 이름·생년월일·이메일 같은 개인 정보는 넣지 않는다 */
export function logEvent(
  scope: string,
  level: "info" | "warn" | "error",
  entry: Record<string, unknown>,
): void {
  const line = JSON.stringify({ scope, level, ...entry });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** 로그에 남길 오류 요약 (원인 체인의 첫 메시지만, 길이 제한) */
export function describeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { error: String(error).slice(0, 300) };
  const cause = error.cause instanceof Error ? error.cause.message : undefined;
  return {
    error: `${error.name}: ${error.message}`.slice(0, 500),
    ...(cause ? { cause: cause.slice(0, 300) } : {}),
  };
}
