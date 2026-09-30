/*
 * 공유 — 모바일·일부 데스크톱 브라우저의 Web Share API로 이미지·글·링크를 보낸다
 * (카카오톡 · 인스타그램 · X · 페이스북 · 메시지 …). 지원하지 않거나 막히면 링크를 클립보드에 복사한다.
 *
 * 공유하는 주소는 개인 풀이 주소(/reading/…)가 아니라 사이트 첫 화면이다. 풀이 주소에는 영문 이름과
 * 생년월일에서 나온 사주 원국이 담겨 있어 공개 SNS에 올리면 개인 정보가 드러난다.
 * 결과는 이름 카드 이미지와 글로 보여 주고, 링크는 친구가 자기 이름을 지어 보도록 첫 화면으로 보낸다.
 */

export interface SharePayload {
  title: string;
  /** 링크 앞에 붙는 글 */
  text: string;
  url: string;
  /** 함께 보낼 이미지 — 파일 공유를 지원하는 곳에서만 붙는다 */
  files?: File[];
}

export type ShareResult =
  | { outcome: "shared"; method: "web_share_file" | "web_share_link" }
  | { outcome: "copied" }
  | { outcome: "cancelled" }
  | { outcome: "failed" };

export function canUseWebShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

export function canShareFiles(files: File[]): boolean {
  if (!canUseWebShare() || typeof navigator.canShare !== "function") {
    return false;
  }
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * 공유 창을 연다. 클릭 처리기에서 다른 비동기 작업 없이 바로 불러야 한다 — 사파리는 클릭 뒤 시간이 지나면
 * 공유를 막는다(그래서 이미지는 미리 만들어 둔다). 공유할 수 없으면 링크를 복사한다.
 */
export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  if (canUseWebShare()) {
    const files =
      payload.files && payload.files.length > 0 && canShareFiles(payload.files)
        ? payload.files
        : null;
    // 파일과 함께 보낼 때는 링크를 글에 넣는다 — 일부 앱은 파일이 있으면 url 항목을 버린다
    const data: ShareData = files
      ? { files, title: payload.title, text: `${payload.text} ${payload.url}` }
      : { title: payload.title, text: payload.text, url: payload.url };
    try {
      await navigator.share(data);
      return {
        outcome: "shared",
        method: files ? "web_share_file" : "web_share_link",
      };
    } catch (error) {
      if (isAbortError(error)) return { outcome: "cancelled" };
      // 권한·형식 문제(NotAllowedError · TypeError) — 링크 복사로 대신한다
    }
  }
  return (await copyText(payload.url))
    ? { outcome: "copied" }
    : { outcome: "failed" };
}

/** 클립보드에 글을 복사한다 — Clipboard API가 없거나 막히면 선택·복사 명령으로 한 번 더 */
export async function copyText(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function" &&
    typeof window !== "undefined" &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 권한이 없으면 아래 방식으로
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  // 화면이 움직이지 않게 고정 위치에 투명하게 둔다 (iOS는 16px 미만 입력칸에 초점이 가면 확대한다)
  Object.assign(field.style, {
    position: "fixed",
    top: "0",
    left: "0",
    opacity: "0",
    pointerEvents: "none",
    fontSize: "16px",
  });
  document.body.append(field);
  field.focus({ preventScroll: true });
  field.select();
  field.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  field.remove();
  previousFocus?.focus({ preventScroll: true });
  return copied;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

// ─── 공유 내용 ───────────────────────────────────────────────

/**
 * 공유 링크 — 친구가 직접 해 볼 수 있는 공개 화면(기본: 첫 화면) + UTM
 * (공유로 들어온 방문을 GA4·자체 지표에서 따로 센다)
 */
export function buildShareUrl(
  siteUrl: string,
  campaign: string,
  path = "/",
): string {
  const url = new URL(path, siteUrl);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", campaign);
  return url.href;
}

/** 공유 링크의 도메인 (카드 아래에 적는다) — www.는 뺀다 */
export function displayHost(siteUrl: string): string {
  return new URL(siteUrl).host.replace(/^www\./, "");
}

export function nameShareText(name: {
  hangul: string;
  hanja: string;
  romanization: string;
}): string {
  return `My Korean name is ${name.hangul} (${name.hanja}) — ${name.romanization} ✨ Discover your Korean name & Saju:`;
}

export function sajuShareText(dayMaster: {
  hanja: string;
  image: string;
}): string {
  return `My Saju says I was born as ${dayMaster.hanja} — ${dayMaster.image.replace(/^The /, "the ")} ✨ Read your Four Pillars free:`;
}

// ─── 환경 ────────────────────────────────────────────────────

/** 카카오톡·인스타그램·페이스북·라인 같은 앱 안 브라우저 — 파일 내려받기가 막힌 경우가 많다 */
export function isInAppBrowser(userAgent: string): boolean {
  return /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|NAVER\(inapp|DaumApps|Snapchat|musical_ly|Bytedance|TikTok|Twitter for/i.test(
    userAgent,
  );
}

/** 아이폰·아이패드 (아이패드 사파리는 맥으로 보고해 터치 지점 수로 가린다) */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  return (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  );
}
