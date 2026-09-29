"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldPath,
  type SubmitHandler,
} from "react-hook-form";

import { primaryButtonClass } from "@/components/ui/styles";
import {
  requestGeneratedNames,
  toFormFieldPath,
} from "@/lib/api/generate-name";
import { nameFormSchema } from "@/lib/validations/name-form";
import type { GenerateNameFailure, GenerateNameResult } from "@/types/api";
import {
  DEFAULT_NAME_LENGTH,
  type NameFormValues,
  type NameRequest,
} from "@/types/name";

import { BirthFields } from "./birth-fields";
import { EnglishNameField } from "./english-name-field";
import { GenderField } from "./gender-field";
import { NameLengthField } from "./name-length-field";
import { NameResults } from "./name-results";
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

interface Generated {
  request: NameRequest;
  result: GenerateNameResult;
}

type ServerError = GenerateNameFailure["error"];

export function NameForm() {
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

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

  /** API를 호출한다. 성공하면 결과를, 실패하면 오류를 돌려준다 (취소되면 null) */
  const generate = async (
    request: NameRequest,
  ): Promise<GenerateNameResult | ServerError | null> => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    try {
      const response = await requestGeneratedNames(request, controller.signal);
      if (controller.signal.aborted) return null;
      return response.ok ? response.data : response.error;
    } catch {
      return null; // 사용자가 취소함
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  };

  const onValidSubmit: SubmitHandler<NameRequest> = async (request) => {
    setServerError(null);
    const outcome = await generate(request);
    if (!outcome) return;

    if ("names" in outcome) {
      setGenerated({ request, result: outcome });
      return;
    }

    // 서버 재검증 오류는 해당 입력 필드 옆에 붙인다
    const fieldErrors = (outcome.fieldErrors ?? [])
      .map((issue) => ({ ...issue, path: toFormFieldPath(issue.path) }))
      .filter((issue) => FORM_FIELD_PATHS.has(issue.path));
    fieldErrors.forEach((issue, index) => {
      methods.setError(
        issue.path as FieldPath<NameFormValues>,
        { type: "server", message: issue.message },
        { shouldFocus: index === 0 },
      );
    });
    setServerError(outcome);
  };

  const handleRegenerate = async () => {
    if (!generated) return;
    setServerError(null);
    setIsRegenerating(true);
    const outcome = await generate(generated.request);
    setIsRegenerating(false);
    if (!outcome) return;
    if ("names" in outcome) {
      setGenerated({ request: generated.request, result: outcome });
    } else {
      setServerError(outcome);
    }
  };

  const handleEdit = () => {
    inFlight.current?.abort();
    // 폼을 즉시 다시 그린 뒤 첫 필드로 포커스를 돌려준다 (누른 버튼이 사라져 포커스가 body로 빠지지 않게)
    flushSync(() => {
      setGenerated(null);
      setServerError(null);
      setIsRegenerating(false);
    });
    methods.setFocus("englishName");
  };

  if (generated) {
    return (
      <div className="flex flex-col gap-6">
        {serverError ? <ServerErrorBanner error={serverError} /> : null}
        <NameResults
          // 새 결과가 오면 선택·도장 설정을 처음 상태로 되돌린다
          key={generated.result.names.map((name) => name.hangul).join("|")}
          request={generated.request}
          result={generated.result}
          onEdit={handleEdit}
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
        />
      </div>
    );
  }

  const { isSubmitting } = methods.formState;

  return (
    <FormProvider {...methods}>
      <form
        noValidate
        aria-busy={isSubmitting || undefined}
        onSubmit={methods.handleSubmit(onValidSubmit)}
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
              {isSubmitting
                ? "Reading your chart and choosing Hanja — this can take up to a minute."
                : "Your birth details are used only to calculate your Saju chart."}
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className={primaryButtonClass}
            >
              {isSubmitting ? "Creating your names…" : "Create my Korean name"}
              <span
                aria-hidden="true"
                lang="ko"
                className="font-serif font-normal text-hanji/60"
              >
                {isSubmitting ? "작명 중" : "이름 짓기"}
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
