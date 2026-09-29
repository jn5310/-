import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/**
 * 브라우저에서만 알 수 있는 값(기기 시간대, 오늘 날짜 등)을 하이드레이션 안전하게 읽는다.
 * 서버 렌더링과 하이드레이션 중에는 serverValue를, 그 이후에는 getClientValue()를 쓴다.
 *
 * - getClientValue는 값이 같으면 같은 참조를 돌려줘야 한다 (배열·객체는 캐시할 것).
 * - serverValue도 렌더마다 새로 만들지 말고 모듈 상수를 넘긴다.
 */
export function useClientValue<T>(getClientValue: () => T, serverValue: T): T {
  return useSyncExternalStore(
    subscribeNever,
    getClientValue,
    () => serverValue,
  );
}
