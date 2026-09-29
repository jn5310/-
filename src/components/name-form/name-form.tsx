"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { flushSync } from "react-dom";
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type SubmitHandler,
} from "react-hook-form";

import { primaryButtonClass } from "@/components/ui/styles";
import { nameFormSchema } from "@/lib/validations/name-form";
import {
  DEFAULT_NAME_LENGTH,
  type NameFormValues,
  type NameRequest,
} from "@/types/name";

import { BirthFields } from "./birth-fields";
import { EnglishNameField } from "./english-name-field";
import { GenderField } from "./gender-field";
import { NameLengthField } from "./name-length-field";
import { RequestPreview } from "./request-preview";
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

export function NameForm() {
  const [submittedRequest, setSubmittedRequest] = useState<NameRequest | null>(
    null,
  );

  // 입력값(NameFormValues) → zod 검증·변환 → handleSubmit에는 NameRequest가 전달된다
  const methods = useForm<NameFormValues, unknown, NameRequest>({
    resolver: zodResolver(nameFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const onValidSubmit: SubmitHandler<NameRequest> = (request) => {
    // TODO: 추천 API 연동 지점 — 사주 분석 → 오행 보완 → 한자 조합 결과(NameRecommendationResult)를 받는다
    setSubmittedRequest(request);
  };

  const handleEdit = () => {
    // 폼을 즉시 다시 그린 뒤 첫 필드로 포커스를 돌려준다 (누른 버튼이 사라져 포커스가 body로 빠지지 않게)
    flushSync(() => setSubmittedRequest(null));
    methods.setFocus("englishName");
  };

  if (submittedRequest) {
    return <RequestPreview request={submittedRequest} onEdit={handleEdit} />;
  }

  const { isSubmitting } = methods.formState;

  return (
    <FormProvider {...methods}>
      <form
        noValidate
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

        <div className="flex flex-col-reverse gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
            Your birth details are used only to calculate your Saju chart.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryButtonClass}
          >
            Create my Korean name
            <span
              aria-hidden="true"
              lang="ko"
              className="font-serif font-normal text-hanji/60"
            >
              이름 짓기
            </span>
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
