import { useFormContext } from "react-hook-form";

import type { NameFormValues, NameRequest } from "@/types/name";

/** 폼 하위 필드 컴포넌트용 — 제네릭(입력값·변환값)을 고정한 useFormContext */
export function useNameFormContext() {
  return useFormContext<NameFormValues, unknown, NameRequest>();
}
