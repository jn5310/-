type ClassValue = string | false | null | undefined;

/** 조건부 className 결합 (의존성 없는 최소 구현) */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
