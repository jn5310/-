"use client";

import { useEffect, useRef } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { secondaryButtonClass } from "@/components/ui/styles";
import { GENDER_OPTIONS } from "@/lib/constants/form-options";
import { formatIsoDate } from "@/lib/date";
import { getBirthHourBranch } from "@/lib/saju/birth-hour";
import type { NameRequest, SurnameSelection } from "@/types/name";

interface RequestPreviewProps {
  request: NameRequest;
  onEdit: () => void;
}

/** 제출된 NameRequest 요약 — 추천 엔진 연동 전까지 결과 영역을 대신한다 */
export function RequestPreview({ request, onEdit }: RequestPreviewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // 화면이 바뀌었음을 스크린리더 사용자에게도 알리도록 제목으로 포커스를 옮긴다
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const { birth } = request;
  const birthHour = birth.time ? getBirthHourBranch(birth.time) : null;

  const rows = [
    { label: "Name", value: request.englishName },
    { label: "Gender", value: GENDER_OPTIONS[request.gender].label },
    { label: "Korean surname", value: formatSurname(request.surname) },
    { label: "Name length", value: `${request.nameLength} characters` },
    {
      label: "Born",
      value: `${formatIsoDate(birth.date)} · ${birth.time ?? "time unknown"}`,
    },
    { label: "Time zone", value: birth.timeZone.replace(/_/g, " ") },
  ];

  return (
    <section
      aria-labelledby="request-preview-title"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-3">
        <Eyebrow hangul="이름 설계서">Naming profile</Eyebrow>
        <h3
          id="request-preview-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-2xl font-semibold text-ink outline-hidden sm:text-3xl"
        >
          Your profile is ready for a Saju reading
        </h3>
        <p className="max-w-2xl text-ink-soft">
          Everything checks out. Name suggestions will appear here once the Saju
          engine is connected.
        </p>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 bg-white/85 px-5 py-4"
          >
            <dt className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
              {row.label}
            </dt>
            <dd className="text-base text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="flex items-center gap-4 rounded-2xl border border-vermilion/20 bg-vermilion/5 px-5 py-4 text-sm text-ink-soft">
        <span
          aria-hidden="true"
          lang="ko"
          className="font-serif text-3xl leading-none text-vermilion"
        >
          {birthHour ? birthHour.hanja.charAt(0) : "三"}
        </span>
        {birthHour ? (
          <span>
            Born in the{" "}
            <strong className="text-ink">Hour of the {birthHour.animal}</strong>{" "}
            (<span lang="ko">{birthHour.hanja}</span>, {birthHour.range}) — this
            becomes your fourth pillar.
          </span>
        ) : (
          <span>
            Birth hour unknown — we’ll read your chart from three pillars (
            <span lang="ko">삼주, 三柱</span>).
          </span>
        )}
      </p>

      <details className="rounded-2xl border border-ink/10 bg-white/60 px-5 py-4 text-sm">
        <summary className="cursor-pointer font-semibold text-ink">
          Request payload{" "}
          <code className="font-normal text-ink-muted">NameRequest</code>
        </summary>
        <pre className="mt-3 overflow-x-auto text-xs leading-relaxed text-ink-soft">
          {JSON.stringify(request, null, 2)}
        </pre>
      </details>

      <div>
        <button type="button" onClick={onEdit} className={secondaryButtonClass}>
          <span aria-hidden="true">←</span> Edit details
        </button>
      </div>
    </section>
  );
}

function formatSurname(surname: SurnameSelection): string {
  return surname.source === "preset"
    ? `${surname.romanization} · ${surname.hangul} ${surname.hanja}`
    : surname.value;
}
