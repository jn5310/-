"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  FormProvider,
  useForm,
  type FieldPath,
  type SubmitHandler,
} from "react-hook-form";

import { BirthFields } from "@/components/name-form/birth-fields";
import { primaryButtonClass } from "@/components/ui/styles";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/track";
import { requestSajuReading } from "@/lib/api/client";
import { sajuFormSchema } from "@/lib/validations/saju";
import type { ApiFailure, SajuRequest } from "@/types/api";
import type { BirthFormValues } from "@/types/name";
import type { SajuResult } from "@/types/saju";

const EMPTY_VALUES: BirthFormValues = {
  birth: { date: "", time: "", timeUnknown: false, timeZone: "" },
};

/** 서버 fieldErrors를 붙일 수 있는 입력 경로 */
const FIELD_PATHS = new Set<string>([
  "birth.date",
  "birth.time",
  "birth.timeUnknown",
  "birth.timeZone",
]);

type ServerError = ApiFailure["error"];

interface SajuFormProps {
  /** 다시 입력할 때 앞서 넣은 값을 채운다 */
  defaultValues?: BirthFormValues;
  onResult: (result: SajuResult, values: BirthFormValues) => void;
}

/** 사주 분석 입력 — 생년월일 · 출생 시각(모름 가능) · 출생지 시간대만 받는다 */
export function SajuForm({ defaultValues, onResult }: SajuFormProps) {
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const methods = useForm<BirthFormValues, unknown, SajuRequest>({
    resolver: zodResolver(sajuFormSchema),
    defaultValues: defaultValues ?? EMPTY_VALUES,
    mode: "onTouched",
  });

  // 화면을 떠나면 진행 중인 요청을 끊는다
  useEffect(() => {
    const pending = inFlight;
    return () => pending.current?.abort();
  }, []);

  const onValidSubmit: SubmitHandler<SajuRequest> = async (request) => {
    setServerError(null);
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    let response: Awaited<ReturnType<typeof requestSajuReading>>;
    try {
      response = await requestSajuReading(request, controller.signal);
    } catch {
      return; // 취소됨
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }

    if (response.ok) {
      trackEvent(ANALYTICS_EVENTS.sajuReading, {
        birth_time_known: request.birth.time !== null,
      });
      onResult(response.data, methods.getValues());
      return;
    }

    // 서버 재검증 오류는 해당 입력 옆에 붙인다
    const fieldErrors = (response.error.fieldErrors ?? []).filter((issue) =>
      FIELD_PATHS.has(issue.path),
    );
    fieldErrors.forEach((issue, index) => {
      methods.setError(
        issue.path as FieldPath<BirthFormValues>,
        { type: "server", message: issue.message },
        { shouldFocus: index === 0 },
      );
    });
    setServerError(response.error);
  };

  const isBusy = methods.formState.isSubmitting;

  return (
    <FormProvider {...methods}>
      <form
        noValidate
        aria-busy={isBusy || undefined}
        onSubmit={(event) => void methods.handleSubmit(onValidSubmit)(event)}
        className="flex flex-col gap-8"
      >
        <BirthFields />

        <div className="flex flex-col gap-4 border-t border-ink/10 pt-8">
          {serverError ? (
            <p
              role="alert"
              className="rounded-2xl border border-vermilion/30 bg-vermilion/5 px-5 py-4 text-sm leading-relaxed text-vermilion-deep"
            >
              {serverError.message}
              {serverError.retryable ? " You can try again." : null}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
              Free and instant. Your birth details are used only to calculate
              your chart and are never stored — see our{" "}
              <Link
                href="/privacy"
                className="font-medium text-ink-soft underline underline-offset-4 hover:text-vermilion"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <button
              type="submit"
              disabled={isBusy}
              className={primaryButtonClass}
            >
              {isBusy ? "Reading your chart…" : "Read my Saju"}
              <span
                aria-hidden="true"
                lang="ko"
                className="font-serif font-normal text-hanji/60"
              >
                사주 보기
              </span>
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
