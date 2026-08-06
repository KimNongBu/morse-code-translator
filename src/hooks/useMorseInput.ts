/**
 * 실제 모스 키 입력을 처리하는 상태 머신 훅.
 *
 * 동작 흐름
 * 1. 키를 누른다               -> 대기 중인 자동 완성 타이머를 모두 취소하고 시각을 기록
 * 2. 키를 뗀다                 -> 누른 시간으로 `.`(<=200ms) / `-`(>200ms) 판정 후 버퍼에 추가
 * 3. 300ms 동안 입력이 없으면  -> 버퍼를 문자 하나로 확정하고 버퍼를 비운다
 * 4. 이후 700ms가 더 지나면    -> 단어 구분자(`/`)를 추가한다
 *
 * 상태의 원본(source of truth)은 ref이고 useState는 렌더링용 사본이다.
 * 타이머 콜백에서 항상 최신 값을 읽어야 하고, StrictMode의 이중 호출에도
 * 값이 두 번 반영되지 않도록 하기 위한 구조다.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  appendToken,
  decodeSingleToken,
  endsWithSeparator,
  morseToText,
  removeLastToken,
} from '../utils/converter';
import {
  AUTO_LETTER_DELAY,
  AUTO_WORD_DELAY,
  DASH,
  DOT,
  DOT_DASH_THRESHOLD,
  WORD_SEPARATOR,
} from '../utils/morseMap';
import { useTimer } from './useTimer';

/** 훅에 넘길 수 있는 옵션 */
export interface UseMorseInputOptions {
  /** 키를 누르기 시작할 때 (소리 재생 등 부수 효과용) */
  onPressStart?: () => void;
  /** 키에서 손을 뗐을 때 */
  onPressEnd?: () => void;
}

/** `useMorseInput`이 돌려주는 값 */
export interface UseMorseInputResult {
  /** 확정된 모스 문자열 (예: `.... . .-.. .-.. ---`) */
  morse: string;
  /** 확정된 모스를 해석한 영어 문자열 */
  text: string;
  /** 아직 문자로 확정되지 않은 현재 입력 버퍼 (예: `.-`) */
  buffer: string;
  /** 현재 버퍼가 어떤 문자가 될지 미리보기. 매칭이 없으면 null */
  bufferPreview: string | null;
  /** 키가 눌린 상태인지 */
  isPressed: boolean;
  /** 모스 키를 누를 때 호출 */
  pressStart: () => void;
  /** 모스 키에서 손을 뗄 때 호출 */
  pressEnd: () => void;
  /** 버퍼의 마지막 기호를, 버퍼가 비었으면 마지막 문자를 지운다 */
  backspace: () => void;
  /** 모든 입력을 초기화한다 */
  clear: () => void;
}

export function useMorseInput(options: UseMorseInputOptions = {}): UseMorseInputResult {
  const { onPressStart, onPressEnd } = options;

  const [morse, setMorseState] = useState('');
  const [buffer, setBufferState] = useState('');
  const [isPressed, setIsPressed] = useState(false);

  // 타이머 콜백에서 최신 값을 읽기 위한 ref 사본
  const morseRef = useRef('');
  const bufferRef = useRef('');
  /** 키를 누르기 시작한 시각. null 이면 눌려 있지 않은 상태 */
  const pressStartedAtRef = useRef<number | null>(null);

  /** 문자 자동 완성용 타이머 (300ms) */
  const letterTimer = useTimer();
  /** 단어 자동 구분용 타이머 (700ms) */
  const wordTimer = useTimer();

  // 콜백 참조를 고정해 pressStart / pressEnd 가 매 렌더마다 새로 만들어지지 않게 한다.
  const callbacksRef = useRef({ onPressStart, onPressEnd });
  callbacksRef.current = { onPressStart, onPressEnd };

  /** ref와 state를 함께 갱신한다. */
  const updateMorse = useCallback((next: string): void => {
    morseRef.current = next;
    setMorseState(next);
  }, []);

  const updateBuffer = useCallback((next: string): void => {
    bufferRef.current = next;
    setBufferState(next);
  }, []);

  /** 700ms 무입력 시: 단어 구분자를 덧붙인다. */
  const commitWord = useCallback((): void => {
    const current = morseRef.current;
    // 내용이 없거나 이미 구분자로 끝나면 중복 추가하지 않는다.
    if (current.length === 0 || endsWithSeparator(current)) return;
    updateMorse(appendToken(current, WORD_SEPARATOR));
  }, [updateMorse]);

  /** 300ms 무입력 시: 버퍼를 문자 하나로 확정한다. */
  const commitLetter = useCallback((): void => {
    const pending = bufferRef.current;
    if (pending.length === 0) return;

    updateBuffer('');
    updateMorse(appendToken(morseRef.current, pending));

    // 문자가 확정된 시점부터 단어 구분 타이머를 시작한다.
    wordTimer.start(commitWord, AUTO_WORD_DELAY);
  }, [updateBuffer, updateMorse, wordTimer, commitWord]);

  const pressStart = useCallback((): void => {
    // 이미 눌려 있으면 무시한다 (키 리피트, 멀티 터치 방어).
    if (pressStartedAtRef.current !== null) return;

    // 입력이 이어지는 중이므로 자동 완성 타이머를 모두 취소한다.
    letterTimer.clear();
    wordTimer.clear();

    pressStartedAtRef.current = performance.now();
    setIsPressed(true);
    callbacksRef.current.onPressStart?.();
  }, [letterTimer, wordTimer]);

  const pressEnd = useCallback((): void => {
    const startedAt = pressStartedAtRef.current;
    if (startedAt === null) return;

    pressStartedAtRef.current = null;
    setIsPressed(false);
    callbacksRef.current.onPressEnd?.();

    // 누르고 있던 시간으로 점/선을 판정한다.
    const heldMs = performance.now() - startedAt;
    const symbol = heldMs <= DOT_DASH_THRESHOLD ? DOT : DASH;
    updateBuffer(bufferRef.current + symbol);

    letterTimer.start(commitLetter, AUTO_LETTER_DELAY);
  }, [updateBuffer, letterTimer, commitLetter]);

  const backspace = useCallback((): void => {
    letterTimer.clear();
    wordTimer.clear();

    // 입력 중인 기호가 있으면 그것부터 지운다.
    if (bufferRef.current.length > 0) {
      const next = bufferRef.current.slice(0, -1);
      updateBuffer(next);
      // 아직 남은 기호가 있다면 자동 완성 타이머를 다시 건다.
      if (next.length > 0) {
        letterTimer.start(commitLetter, AUTO_LETTER_DELAY);
      }
      return;
    }

    // 버퍼가 비어 있으면 확정된 마지막 문자를 되돌린다.
    if (morseRef.current.length > 0) {
      updateMorse(removeLastToken(morseRef.current));
    }
  }, [letterTimer, wordTimer, updateBuffer, updateMorse, commitLetter]);

  const clear = useCallback((): void => {
    letterTimer.clear();
    wordTimer.clear();
    pressStartedAtRef.current = null;
    setIsPressed(false);
    updateBuffer('');
    updateMorse('');
  }, [letterTimer, wordTimer, updateBuffer, updateMorse]);

  // 파생 값은 메모이제이션해서 불필요한 재계산을 막는다.
  const text = useMemo(() => morseToText(morse), [morse]);
  const bufferPreview = useMemo(() => decodeSingleToken(buffer), [buffer]);

  return {
    morse,
    text,
    buffer,
    bufferPreview,
    isPressed,
    pressStart,
    pressEnd,
    backspace,
    clear,
  };
}
