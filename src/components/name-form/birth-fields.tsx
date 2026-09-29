"use client";

import { useEffect, useMemo } from "react";
import { useWatch } from "react-hook-form";

import { describedBy, Field, FieldGroup } from "@/components/ui/field";
import { inputClass } from "@/components/ui/styles";
import { useClientValue } from "@/hooks/use-client-value";
import { cn } from "@/lib/cn";
import { getTodayIsoDate } from "@/lib/date";
import {
  getBirthHourBranch,
  type BirthHourBranch,
} from "@/lib/saju/birth-hour";
import { FIVE_ELEMENT_META } from "@/lib/saju/five-elements";
import {
  getBrowserTimeZone,
  getSupportedTimeZones,
  groupTimeZones,
  withTimeZone,
} from "@/lib/time-zone";
import { MIN_BIRTH_DATE } from "@/lib/validations/name-form";

import { useNameFormContext } from "./use-name-form-context";

const IDS = {
  group: "birth",
  date: "birth-date",
  time: "birth-time",
  timeUnknown: "birth-time-unknown",
  timeZone: "birth-time-zone",
} as const;

/** 서버 렌더링 시점의 스냅샷 — 렌더마다 새 배열을 만들지 않도록 모듈 상수로 둔다 */
const NO_TIME_ZONES: readonly string[] = [];

export function BirthFields() {
  const {
    control,
    register,
    getValues,
    setValue,
    clearErrors,
    formState: { errors },
  } = useNameFormContext();
  const [time, timeUnknown] = useWatch({
    control,
    name: ["birth.time", "birth.timeUnknown"],
  });

  // 브라우저에서만 알 수 있는 값은 하이드레이션 이후에 읽는다
  const today = useClientValue<string | undefined>(getTodayIsoDate, undefined);
  const supportedZones = useClientValue(getSupportedTimeZones, NO_TIME_ZONES);
  const deviceZone = useClientValue(getBrowserTimeZone, null);

  // 기기 시간대를 기본값으로 채운다 — 사용자가 이미 고른 값은 덮어쓰지 않는다
  useEffect(() => {
    if (deviceZone && !getValues("birth.timeZone")) {
      setValue("birth.timeZone", deviceZone);
    }
  }, [deviceZone, getValues, setValue]);

  const zoneGroups = useMemo(
    () => groupTimeZones(withTimeZone(supportedZones, deviceZone)),
    [supportedZones, deviceZone],
  );
  const birthHour = timeUnknown ? null : getBirthHourBranch(time);

  const dateError = errors.birth?.date?.message;
  const timeError = errors.birth?.time?.message;
  const zoneError = errors.birth?.timeZone?.message;

  return (
    <FieldGroup
      id={IDS.group}
      label="Birth date & time"
      hangul="생년월일시"
      hint={
        <>
          Your Saju (<span lang="ko">사주</span>) is read from the moment you
          were born, in your birthplace’s local time.
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={IDS.date}
          label="Date of birth"
          hangul="생년월일"
          error={dateError}
        >
          <input
            id={IDS.date}
            type="date"
            min={MIN_BIRTH_DATE}
            max={today}
            autoComplete="bday"
            aria-invalid={dateError ? true : undefined}
            aria-describedby={describedBy(IDS.date, {
              error: Boolean(dateError),
            })}
            className={inputClass}
            {...register("birth.date")}
          />
        </Field>

        <div className="flex flex-col gap-3">
          <Field
            id={IDS.time}
            label="Time of birth"
            hangul="태어난 시각"
            error={timeError}
          >
            <input
              id={IDS.time}
              type="time"
              step={60}
              disabled={timeUnknown}
              aria-invalid={timeError ? true : undefined}
              aria-describedby={describedBy(IDS.time, {
                error: Boolean(timeError),
              })}
              className={inputClass}
              {...register("birth.time")}
            />
          </Field>
          <label
            htmlFor={IDS.timeUnknown}
            className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft"
          >
            <input
              id={IDS.timeUnknown}
              type="checkbox"
              className="size-4 rounded accent-vermilion"
              {...register("birth.timeUnknown", {
                onChange: (event: { target: { checked: boolean } }) => {
                  if (event.target.checked) clearErrors("birth.time");
                },
              })}
            />
            I don’t know my birth time
          </label>
        </div>
      </div>

      <BirthHourNote birthHour={birthHour} timeUnknown={timeUnknown} />

      <Field
        id={IDS.timeZone}
        label="Birth time zone"
        hangul="출생지 시간대"
        hint="Detected from your device — change it if you were born somewhere else."
        error={zoneError}
      >
        <select
          id={IDS.timeZone}
          aria-invalid={zoneError ? true : undefined}
          aria-describedby={describedBy(IDS.timeZone, {
            hint: true,
            error: Boolean(zoneError),
          })}
          className={cn(inputClass, "pr-10")}
          {...register("birth.timeZone")}
        >
          <option value="" disabled>
            {supportedZones.length > 0
              ? "Select a time zone"
              : "Detecting your time zone…"}
          </option>
          {zoneGroups.map((group) => (
            <optgroup key={group.region} label={group.region}>
              {group.zones.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
    </FieldGroup>
  );
}

interface BirthHourNoteProps {
  birthHour: BirthHourBranch | null;
  timeUnknown: boolean;
}

/** 입력한 시각이 12지시 중 어디에 해당하는지 보여주는 안내 (시계 시각 기준 근사치) */
function BirthHourNote({ birthHour, timeUnknown }: BirthHourNoteProps) {
  const element = birthHour ? FIVE_ELEMENT_META[birthHour.element] : null;

  return (
    <div
      aria-live="polite"
      className="flex items-start gap-4 rounded-2xl border border-ink/10 bg-hanji/70 px-4 py-3.5"
    >
      <span
        aria-hidden="true"
        lang="ko"
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/80 font-serif text-xl text-vermilion shadow-sm"
      >
        {birthHour ? birthHour.hanja.charAt(0) : "時"}
      </span>
      <div className="flex flex-col gap-1 text-sm leading-relaxed">
        {birthHour && element ? (
          <>
            <p className="font-semibold text-ink">
              Hour of the {birthHour.animal}{" "}
              <span lang="ko" className="font-serif font-normal text-ink-muted">
                {birthHour.hanja} · {birthHour.hangul}
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-ink-muted">
              <span>{birthHour.range}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2.5 rounded-full ring-1 ring-ink/20",
                    element.swatchClass,
                  )}
                />
                {element.label}{" "}
                <span lang="ko" className="font-serif">
                  {element.hanja}
                </span>
              </span>
            </p>
            <p className="text-xs text-ink-muted">
              A clock-time estimate — the full reading also corrects for your
              birthplace’s true solar time.
            </p>
          </>
        ) : timeUnknown ? (
          <p className="text-ink-soft">
            No problem — we’ll read your year, month and day pillars (
            <span lang="ko">삼주, 三柱</span>) without the hour.
          </p>
        ) : (
          <p className="text-ink-soft">
            Even an approximate time helps: the hour sets your fourth pillar (
            <span lang="ko">시주, 時柱</span>).
          </p>
        )}
      </div>
    </div>
  );
}
