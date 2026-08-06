/**
 * 재사용 가능한 타이머 훅.
 *
 * 모스 키 입력에서는 "문자 자동 완성(300ms)", "단어 자동 구분(700ms)" 처럼
 * 계속 취소·재시작되는 타이머가 필요하다. setTimeout id 관리와 언마운트 정리를
 * 한곳에 모아 컴포넌트 코드가 지저분해지지 않도록 한다.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

/** `useTimer`가 돌려주는 제어 객체 */
export interface TimerController {
  /** 기존 예약을 취소하고 새 타이머를 시작한다. */
  start: (callback: () => void, delayMs: number) => void;
  /** 예약된 타이머를 취소한다. */
  clear: () => void;
  /** 현재 대기 중인 타이머가 있는지 확인한다. */
  isPending: () => boolean;
}

/**
 * 한 번에 하나의 예약만 유지하는 타이머를 만든다.
 * 반환 객체는 참조가 고정되어 있어 의존성 배열에 넣어도 리렌더링을 유발하지 않는다.
 */
export function useTimer(): TimerController {
  const timeoutIdRef = useRef<number | null>(null);

  const clear = useCallback((): void => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const start = useCallback(
    (callback: () => void, delayMs: number): void => {
      clear();
      timeoutIdRef.current = window.setTimeout(() => {
        timeoutIdRef.current = null;
        callback();
      }, delayMs);
    },
    [clear],
  );

  const isPending = useCallback((): boolean => timeoutIdRef.current !== null, []);

  // 언마운트 시 남아 있는 타이머를 정리한다.
  useEffect(() => clear, [clear]);

  return useMemo(() => ({ start, clear, isPending }), [start, clear, isPending]);
}
