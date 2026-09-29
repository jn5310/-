"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldPath,
  type SubmitHandler,
} from "react-hook-form";

import { primaryButtonClass } from "@/components/ui/styles";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/track";
import { requestGeneratedNames, toFormFieldPath } from "@/lib/api/client";
import { nameFormSchema } from "@/lib/validations/name-form";
import type { ApiFailure } from "@/types/api";
import {
  DEFAULT_NAME_LENGTH,
  type NameFormValues,
  type NameRequest,
} from "@/types/name";

import { BirthFields } from "./birth-fields";
import { EnglishNameField } from "./english-name-field";
import { GenderField } from "./gender-field";
import { NameLengthField } from "./name-length-field";
import { SurnameField } from "./surname-field";

/**
 * 성별·성씨는 사용자가 의식적으로 고르도록 기본값을 비워 둔다.
 * 시간대는 BirthFields가 하이드레이션 이후 기기 시간대로 채운다.
 */
const DEFAULT_VALUES: DefaultValues<NameFormValues> = {
  englishName: "",
  surname: { custom: "" },
  birth: { date: "", time: "", timeUnknown: false, timeZone: "" },
  nameLength: DEFAULT_NAME_LENGTH,
};

/** 폼 필드 경로 — 서버 fieldErrors를 붙일 수 있는 값만 허용한다 */
const FORM_FIELD_PATHS = new Set<string>([
  "englishName",
  "gender",
  "surname.choice",
  "surname.custom",
  "birth.date",
  "birth.time",
  "birth.timeUnknown",
  "birth.timeZone",
  "nameLength",
]);

type ServerError = ApiFailure["error"];

export function NameForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const inFlight = useRef<AbortController | null>(null);
  const formStarted = useRef(false);

  // 입력값(NameFormValues) → zod 검증·변환 → handleSubmit에는 NameRequest가 전달된다
  const methods = useForm<NameFormValues, unknown, NameRequest>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  // 화면을 떠나면 진행 중인 요청을 끊는다
  useEffect(() => {
    const pending = inFlight;
    return () => pending.current?.abort();
  }, []);

  // 퍼널 1단계: 폼에 처음 손댄 순간 (방문마다 한 번)
  const handleFormFocus = () => {
    if (formStarted.current) return;
    formStarted.current = true;
    trackEvent(ANALYTICS_EVENTS.formStart);
  };

  const onValidSubmit: SubmitHandler<NameRequest> = async (request) => {
    setServerError(null);
    // 개인 정보(이름·생년월일)는 보내지 않고 선택지 종류만 보낸다
    trackEvent(ANALYTICS_EVENTS.formSubmit, {
      name_length: request.nameLength,
      surname_source: request.surname.source,
      birth_time_known: request.birth.time !== null,
    });
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    let response: Awaited<ReturnType<typeof requestGeneratedNames>>;
    try {
      response = await requestGeneratedNames(request, controller.signal);
    } catch {
      return; // 취소됨
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }

    if (response.ok) {
      trackEvent(ANALYTICS_EVENTS.lead, { lead_source: "name_form" });
      // 결과는 서버에 저장돼 있다 — 새로고침·공유·결제 복귀에 모두 쓰이는 풀이 페이지로 옮긴다
      const { readingId } = response.data;
      startNavigation(() => {
        router.push(`/reading/${readingId}`);
      });
      return;
    }

    trackEvent(ANALYTICS_EVENTS.generationError, {
      error_code: response.error.code,
    });

    // 서버 재검증 오류는 해당 입력 필드 옆에 붙인다
    const fieldErrors = (response.error.fieldErrors ?? [])
      .map((issue) => ({ ...issue, path: toFormFieldPath(issue.path) }))
      .filter((issue) => FORM_FIELD_PATHS.has(issue.path));
    fieldErrors.forEach((issue, index) => {
      methods.setError(
        issue.path as FieldPath<NameFormValues>,
        { type: "server", message: issue.message },
        { shouldFocus: index === 0 },
      );
    });
    setServerError(response.error);
  };

  const isBusy = methods.formState.isSubmitting || isNavigating;

  return (
    <FormProvider {...methods}>
      <form
        noValidate
        aria-busy={isBusy || undefined}
        onFocus={handleFormFocus}
        onSubmit={(event) => void methods.handleSubmit(onValidSubmit)(event)}
        className="flex flex-col divide-y divide-ink/10"
      >
        <div className="grid gap-8 pb-10 lg:grid-cols-2">
          <EnglishNameField />
          <GenderField />
        </div>
        <div className="py-10">
          <SurnameField />
        </div>
        <div className="py-10">
          <BirthFields />
        </div>
        <div className="py-10">
          <NameLengthField />
        </div>

        <div className="flex flex-col gap-4 pt-8">
          {serverError ? <ServerErrorBanner error={serverError} /> : null}
          <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p
              aria-live="polite"
              className="max-w-sm text-sm leading-relaxed text-ink-muted"
            >
              {isBusy ? (
                "Reading your chart and choosing Hanja — this can take up to a minute."
              ) : (
                <>
                  Your details are used only to create your reading — see our{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-ink-soft underline underline-offset-4 hover:text-vermilion"
                  >
                    Privacy Policy
                  </Link>
                  .
                </>
              )}
            </p>
            <button
              type="submit"
              disabled={isBusy}
              className={primaryButtonClass}
            >
              {isBusy ? "Creating your names…" : "Create my Korean name"}
              <span
                aria-hidden="true"
                lang="ko"
                className="font-serif font-normal text-hanji/60"
              >
                {isBusy ? "작명 중" : "이름 짓기"}
              </span>
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

function ServerErrorBanner({ error }: { error: ServerError }) {
  return (
    <p
      role="alert"
      className="rounded-2xl border border-vermilion/30 bg-vermilion/5 px-5 py-4 text-sm leading-relaxed text-vermilion-deep"
    >
      {error.message}
      {error.retryable ? " You can try again." : null}
    </p>
  );
}
