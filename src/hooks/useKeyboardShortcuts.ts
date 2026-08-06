/**
 * 전역 단축키 처리 훅.
 *
 * Space     : 모스 키 입력 (누른 시간으로 점/선 판정)
 * Backspace : 현재 입력 중인 점/선 삭제
 * ESC       : 전체 초기화
 * Ctrl(⌘)+C : 현재 모스 복사
 *
 * 텍스트 입력 요소에 포커스가 있을 때는 일반 타이핑을 방해하지 않도록 건너뛴다.
 */

import { useEffect, useRef } from 'react';

/** 단축키에 연결할 동작들 */
export interface KeyboardShortcutHandlers {
  /** Space를 누르는 순간 */
  onKeyDown: () => void;
  /** Space에서 손을 떼는 순간 */
  onKeyUp: () => void;
  /** Backspace */
  onBackspace: () => void;
  /** ESC */
  onEscape: () => void;
  /** Ctrl/Cmd + C */
  onCopy: () => void;
}

/** 타이핑 중인 요소인지 판별한다. */
function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  // 핸들러가 매 렌더마다 바뀌어도 리스너를 다시 등록하지 않도록 ref에 담아둔다.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    /** Space가 눌린 상태인지 추적해 keyup 유실에 대비한다. */
    let isSpaceHeld = false;

    const releaseSpace = (): void => {
      if (!isSpaceHeld) return;
      isSpaceHeld = false;
      handlersRef.current.onKeyUp();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      // ESC는 포커스 위치와 상관없이 항상 동작한다.
      if (event.key === 'Escape') {
        event.preventDefault();
        handlersRef.current.onEscape();
        return;
      }

      // Ctrl/Cmd + C: 사용자가 직접 드래그한 선택 영역이 있으면 기본 복사를 존중한다.
      if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C')) {
        const selection = window.getSelection()?.toString() ?? '';
        if (selection.length === 0 && !isTextEntryElement(event.target)) {
          event.preventDefault();
          handlersRef.current.onCopy();
        }
        return;
      }

      // 아래 단축키들은 텍스트 입력 중에는 동작하지 않아야 한다.
      if (isTextEntryElement(event.target)) return;

      if (event.code === 'Space') {
        event.preventDefault(); // 페이지 스크롤 방지
        if (event.repeat || isSpaceHeld) return;
        isSpaceHeld = true;
        handlersRef.current.onKeyDown();
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault(); // 브라우저 뒤로가기 방지
        handlersRef.current.onBackspace();
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      releaseSpace();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // 탭 전환 등으로 keyup을 놓치면 키가 눌린 채로 남으므로 안전장치를 둔다.
    window.addEventListener('blur', releaseSpace);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseSpace);
    };
  }, []);
}
