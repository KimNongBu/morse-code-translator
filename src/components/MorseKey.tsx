/**
 * 실제 전신기처럼 동작하는 모스 키 버튼.
 *
 * 입력 수단
 * - 마우스 / 터치 : Pointer Events (포인터 캡처로 버튼 밖에서 떼도 정상 처리)
 * - 키보드        : Spacebar (전역 단축키 훅에서 처리, 여기서는 상태만 반영)
 *
 * 누르고 있는 동안의 게이지는 rAF로 DOM을 직접 갱신한다.
 * 60fps로 setState를 호출하면 앱 전체가 매 프레임 리렌더링되기 때문이다.
 */

import { memo, useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { DOT_DASH_THRESHOLD } from '../utils/morseMap';
import styles from './MorseKey.module.css';

/** 게이지가 가득 차는 기준 시간 (임계값의 2배 = 400ms) */
const GAUGE_FULL_MS = DOT_DASH_THRESHOLD * 2;

export interface MorseKeyProps {
  /** 현재 눌린 상태인지 */
  isPressed: boolean;
  /** 누르기 시작할 때 */
  onPressStart: () => void;
  /** 손을 뗄 때 */
  onPressEnd: () => void;
}

function MorseKeyComponent({ isPressed, onPressStart, onPressEnd }: MorseKeyProps) {
  const gaugeFillRef = useRef<HTMLDivElement>(null);
  const liveSymbolRef = useRef<HTMLSpanElement>(null);

  // 눌린 동안 게이지와 현재 기호 표시를 애니메이션한다.
  useEffect(() => {
    const gauge = gaugeFillRef.current;
    const liveSymbol = liveSymbolRef.current;

    if (!isPressed) {
      if (gauge) {
        gauge.style.width = '0%';
        gauge.dataset.symbol = 'dot';
      }
      if (liveSymbol) liveSymbol.textContent = '';
      return;
    }

    // 렌더링 이후에 시작하므로 실제 누른 시각과 몇 ms 차이가 날 수 있다.
    // 판정 자체는 useMorseInput에서 정확히 계산하므로 표시용으로는 충분하다.
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (): void => {
      const heldMs = performance.now() - startedAt;
      const isDash = heldMs > DOT_DASH_THRESHOLD;

      if (gauge) {
        gauge.style.width = `${Math.min(100, (heldMs / GAUGE_FULL_MS) * 100)}%`;
        gauge.dataset.symbol = isDash ? 'dash' : 'dot';
      }
      if (liveSymbol) {
        liveSymbol.textContent = isDash ? '–' : '·';
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPressed]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      // 포인터를 캡처하면 버튼 밖에서 손을 떼도 pointerup을 받을 수 있다.
      event.currentTarget.setPointerCapture(event.pointerId);
      onPressStart();
    },
    [onPressStart],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      onPressEnd();
    },
    [onPressEnd],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.strip}>
        <span>key · manual input</span>
        <span className={isPressed ? `${styles.stripState} ${styles.stripStateOn}` : styles.stripState}>
          {isPressed ? '● keying' : '○ standby'}
        </span>
      </div>

      <button
        type="button"
        className={isPressed ? `${styles.key} ${styles.pressed}` : styles.key}
        aria-pressed={isPressed}
        aria-label="모스 키 — 누르고 있는 시간으로 점과 선을 입력합니다"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className={styles.label}>press to key</span>
        <span className={styles.hint}>
          hold ≤{DOT_DASH_THRESHOLD}ms = dot · {'>'}
          {DOT_DASH_THRESHOLD}ms = dash
        </span>

        <span className={styles.liveSymbol} ref={liveSymbolRef} aria-hidden="true" />

        <span className={styles.gauge} aria-hidden="true">
          <span className={styles.gaugeFill} ref={gaugeFillRef} data-symbol="dot" />
          <span className={styles.gaugeMark} />
        </span>
      </button>

      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <kbd className={styles.kbd}>Space</kbd> key
        </span>
        <span className={styles.legendItem}>
          <kbd className={styles.kbd}>⌫</kbd> delete
        </span>
        <span className={styles.legendItem}>
          <kbd className={styles.kbd}>Esc</kbd> reset
        </span>
        <span className={styles.legendItem}>
          <kbd className={styles.kbd}>Ctrl</kbd>+<kbd className={styles.kbd}>C</kbd> copy
        </span>
      </p>
    </div>
  );
}

export const MorseKey = memo(MorseKeyComponent);
