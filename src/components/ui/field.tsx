import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** 힌트·오류 문구의 id 규칙 — aria-describedby 연결에 사용한다 */
export function fieldMessageIds(id: string) {
  return { hintId: `${id}-hint`, errorId: `${id}-error` };
}

export function describedBy(
  id: string,
  { hint = false, error = false }: { hint?: boolean; error?: boolean },
): string | undefined {
  const { hintId, errorId } = fieldMessageIds(id);
  const ids = [hint && hintId, error && errorId].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

interface FieldProps {
  /** Field: 컨트롤 id / FieldGroup: 그룹 id — 힌트·오류 id의 접두어가 된다 */
  id: string;
  label: string;
  /** 라벨 옆에 병기하는 한국어 */
  hangul?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}

function LabelContent({ label, hangul }: Pick<FieldProps, "label" | "hangul">) {
  return (
    <>
      <span>{label}</span>
      {hangul ? (
        <span
          lang="ko"
          className="font-serif text-sm font-normal text-ink-muted"
        >
          {hangul}
        </span>
      ) : null}
    </>
  );
}

export function FieldHint({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p
      id={fieldMessageIds(id).hintId}
      className="text-sm leading-relaxed text-ink-muted"
    >
      {children}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p
      id={fieldMessageIds(id).errorId}
      className="flex items-start gap-2 text-sm font-medium text-vermilion"
    >
      <span
        aria-hidden="true"
        className="mt-[0.45em] size-1.5 shrink-0 rotate-45 bg-current"
      />
      {message}
    </p>
  );
}

/** 단일 입력 필드: label → hint → control → error */
export function Field({
  id,
  label,
  hangul,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink"
      >
        <LabelContent label={label} hangul={hangul} />
      </label>
      {hint ? <FieldHint id={id}>{hint}</FieldHint> : null}
      {children}
      <FieldError id={id} message={error} />
    </div>
  );
}

/** 라디오 그룹처럼 여러 컨트롤을 묶는 필드: fieldset + legend */
export function FieldGroup({
  id,
  label,
  hangul,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <fieldset
      aria-describedby={describedBy(id, {
        hint: Boolean(hint),
        error: Boolean(error),
      })}
      className={cn("min-w-0", className)}
    >
      <legend className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
        <LabelContent label={label} hangul={hangul} />
      </legend>
      <div className="flex flex-col gap-3">
        {hint ? <FieldHint id={id}>{hint}</FieldHint> : null}
        {children}
        <FieldError id={id} message={error} />
      </div>
    </fieldset>
  );
}
