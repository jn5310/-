/**
 * 제한 시간이 지나면 TimeoutError로 중단되는 신호.
 *
 * AbortSignal.timeout()은 타이머가 이벤트 루프를 붙잡지 않아(unref), 기다릴 I/O가 없는 상황에서는
 * 끝내 발생하지 않을 수 있다. 제한 시간을 확실히 지키도록 일반 타이머로 만들고, 끝나면 dispose()로 정리한다.
 */
export function createTimeoutSignal(ms: number): {
  signal: AbortSignal;
  dispose: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(
      new DOMException(`Timed out after ${ms}ms.`, "TimeoutError"),
    );
  }, ms);
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}
