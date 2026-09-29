import type { SealFont } from "./types";

const DEFAULT_TIMEOUT_MS = 6000;

/**
 * 캔버스에 그리기 전에 폰트를 확실히 내려받는다.
 *
 * 한글 웹 폰트는 unicode-range로 잘게 나뉘어 있어서, 새길 글자(text)를 함께 넘겨야
 * 그 글자가 들어 있는 조각만 골라 받는다. 캔버스는 폰트가 준비되지 않아도 기다려 주지 않고
 * 대체 글꼴로 그려 버리므로 이 단계가 꼭 필요하다.
 *
 * @returns 폰트 면(face)을 하나 이상 불러왔으면 true — false면 대체 글꼴로 그려진다
 */
export async function loadSealFont(
  font: SealFont,
  text: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts?.load) return false;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("font load timeout")), timeoutMs);
  });

  try {
    const faces = await Promise.race([
      document.fonts.load(`${font.weight} 64px ${font.family}`, text),
      timeout,
    ]);
    return faces.length > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
