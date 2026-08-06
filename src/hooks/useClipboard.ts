/**
 * 클립보드 복사 + 결과 토스트 메시지를 관리하는 훅.
 *
 * `navigator.clipboard`를 사용할 수 없는 환경(비 HTTPS 등)을 위해
 * textarea + execCommand 폴백을 함께 제공한다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** 토스트가 화면에 표시되는 시간 (ms) */
const TOAST_DURATION = 1800;

export interface UseClipboardResult {
  /** 현재 표시할 토스트 메시지. 없으면 null */
  message: string | null;
  /** 텍스트를 복사하고 토스트를 띄운다. */
  copy: (text: string, label: string) => Promise<void>;
  /** 복사 외의 안내 메시지를 띄운다. */
  notify: (text: string) => void;
}

/** clipboard API를 쓸 수 없을 때의 폴백 복사 */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
}

export function useClipboard(): UseClipboardResult {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const notify = useCallback((text: string): void => {
    setMessage(text);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setMessage(null);
    }, TOAST_DURATION);
  }, []);

  const copy = useCallback(
    async (text: string, label: string): Promise<void> => {
      if (text.trim().length === 0) {
        notify('복사할 내용이 없습니다');
        return;
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (!legacyCopy(text)) {
          throw new Error('execCommand copy failed');
        }
        notify(`${label} 복사 완료`);
      } catch {
        notify('복사에 실패했습니다');
      }
    },
    [notify],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return { message, copy, notify };
}
