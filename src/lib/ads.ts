/*
 * Google AdSense 설정 — 모두 선택 사항이다. 값이 없으면 광고를 그리지 않는다(개발 중에는 자리만 표시).
 * NEXT_PUBLIC_ 값은 빌드할 때 코드에 박히므로, 바꾸면 dev 서버를 다시 켜거나 다시 빌드한다.
 *
 * 수익 모델: 무료 화면(랜딩·무료 미리보기)은 광고로, 유료 풀이는 광고 없이.
 * 결제한 사용자에게 광고를 보이지 않는 것도 프리미엄 혜택이다.
 */

const CLIENT_ID_PATTERN = /^ca-pub-\d{10,20}$/;
const SLOT_PATTERN = /^\d{6,20}$/;

function readClientId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && CLIENT_ID_PATTERN.test(trimmed) ? trimmed : undefined;
}

function readSlot(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && SLOT_PATTERN.test(trimmed) ? trimmed : undefined;
}

/** 게시자 ID (예: ca-pub-1234567890123456) */
export const ADSENSE_CLIENT_ID = readClientId(
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
);

/** 광고 단위(슬롯) ID — AdSense › 광고 › 광고 단위 기준에서 '디스플레이 광고'를 만들어 받는다 */
export const AD_SLOTS = {
  /** 랜딩 페이지 하단 (도장 체험 아래) */
  landing: readSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_LANDING),
  /** 무료 미리보기 하단 (결제 카드와 떨어진 곳) */
  reading: readSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_READING),
} as const;

export type AdPlacement = keyof typeof AD_SLOTS;

/** ads.txt 한 줄 — ca-pub-… → pub-… (Google의 인증 기관 ID f08c47fec0942fa0는 고정값) */
export function getAdsTxtLine(clientId = ADSENSE_CLIENT_ID): string | null {
  return clientId
    ? `google.com, ${clientId.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`
    : null;
}
