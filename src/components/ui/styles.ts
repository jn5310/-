/*
 * 반복되는 Tailwind 클래스 묶음 — 폼 컨트롤과 버튼의 시각 언어를 통일한다.
 * Tailwind는 .ts 파일도 스캔하므로 여기 적힌 클래스도 CSS로 생성된다.
 */

/**
 * 오류 상태(aria-invalid)에서도 포커스가 보이도록 `aria-invalid:focus:` 링을 더 진하게 겹친다.
 * (0,3,0) 명시도라 일반 focus·invalid 규칙보다 항상 우선한다.
 */
export const inputClass =
  "block w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 text-base text-ink shadow-sm transition placeholder:text-ink-muted hover:border-ink/30 focus:border-vermilion focus:ring-4 focus:ring-vermilion/15 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-hanji-deep/60 disabled:text-ink/40 aria-invalid:border-vermilion aria-invalid:ring-2 aria-invalid:ring-vermilion/10 aria-invalid:focus:ring-4 aria-invalid:focus:ring-vermilion/30";

/**
 * 라디오 카드 공통 스타일 (레이아웃 클래스는 사용하는 쪽에서 덧붙인다).
 * 고대비(forced-colors) 모드에서는 배경·그림자가 지워지므로 선택·포커스를 outline으로도 표시한다.
 */
export const choiceCardClass =
  "group relative cursor-pointer rounded-2xl border border-ink/12 bg-white/70 transition select-none hover:border-ink/30 hover:bg-white has-checked:border-vermilion has-checked:bg-vermilion/5 has-checked:shadow-[0_0_0_1px_var(--color-vermilion)] has-focus-visible:ring-4 has-focus-visible:ring-vermilion/20 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-transparent has-disabled:cursor-not-allowed has-disabled:opacity-45 forced-colors:has-checked:outline-2 forced-colors:has-checked:outline-offset-2 forced-colors:has-checked:outline-[Highlight]";

/** 선택된 카드 우상단에 찍히는 인주(印朱) 점 */
export const choiceIndicatorClass =
  "pointer-events-none absolute top-2.5 right-2.5 size-2 rounded-full bg-vermilion opacity-0 transition-opacity group-has-checked:opacity-100";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-3 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold tracking-wide text-hanji shadow-lg shadow-ink/15 transition hover:bg-vermilion focus-visible:ring-4 focus-visible:ring-vermilion/30 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-60";

/** 결제(페이월) CTA — 인주색으로 화면에서 가장 눈에 띄게. 글자 대비 약 6:1 */
export const ctaButtonClass =
  "inline-flex items-center justify-center gap-3 rounded-full bg-vermilion px-7 py-4 text-base font-semibold tracking-wide text-hanji shadow-lg shadow-vermilion/25 transition hover:bg-vermilion-deep focus-visible:ring-4 focus-visible:ring-vermilion/30 focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-70";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 bg-white/50 px-7 py-3.5 text-sm font-semibold text-ink transition hover:border-ink/40 hover:bg-white focus-visible:ring-4 focus-visible:ring-ink/10 focus-visible:outline-hidden";
