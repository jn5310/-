export class StorageError extends Error {
  constructor(
    /** configuration: 설정이 빠짐(500) · unavailable: 저장소 일시 오류 */
    readonly kind: "configuration" | "unavailable",
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "StorageError";
  }
}
