/*
 * 결제(페이월) 스위치 — 기본값은 꺼짐.
 *
 * 꺼져 있으면(초기 트래픽 확보 기간) 이름 3개 · 사주/한자 상세 풀이 · 도장 PNG · 증명서 PDF를
 * 결제 없이 바로 보여 준다. Stripe 결제 버튼은 나오지 않고 결제 API(/api/checkout)도 막힌다.
 *
 * 다시 유료로 바꾸려면 NEXT_PUBLIC_PAYWALL_ENABLED=true를 넣고 다시 배포한다.
 * NEXT_PUBLIC_ 값은 빌드할 때 브라우저·서버 코드에 똑같이 박히므로 화면과 서버가 늘 같은 값을 본다.
 */

export function isPaywallEnabled(): boolean {
  // process.env.NEXT_PUBLIC_…를 그대로 읽어야 빌드 때 값으로 바뀐다 (구조 분해하면 브라우저에서 비어 버린다)
  const value = process.env.NEXT_PUBLIC_PAYWALL_ENABLED;
  return /^(1|true|on|yes)$/i.test(value?.trim() ?? "");
}

/** 풀이 보존 기간(일) — 만든 풀이(무료 개방·결제 전 미리보기)와 결제한 풀이 */
export const READING_RETENTION_DAYS = { standard: 30, purchased: 400 } as const;
