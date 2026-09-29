import type { ZodError } from "zod";

import type { FieldIssue } from "@/types/api";

/**
 * 검증 오류 → API의 fieldErrors. 경로마다 첫 번째 오류만 돌려준다. 경로는 요청 본문 기준이다.
 * 이름 짓기 폼에 붙일 때는 surname.id → surname.choice, surname.value → surname.custom으로 바꾼다 (toFormFieldPath).
 */
export function toFieldIssues(error: ZodError): FieldIssue[] {
  const seen = new Set<string>();
  const issues: FieldIssue[] = [];
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (seen.has(path)) continue;
    seen.add(path);
    issues.push({ path, message: issue.message });
  }
  return issues;
}
