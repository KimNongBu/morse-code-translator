/**
 * 복사 결과 등을 알려주는 간단한 토스트.
 * 메시지가 null이면 아무것도 렌더링하지 않는다.
 */

import { memo } from 'react';

import styles from './Toast.module.css';

export interface ToastProps {
  /** 표시할 메시지. null이면 숨김 */
  message: string | null;
}

function ToastComponent({ message }: ToastProps) {
  if (message === null) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export const Toast = memo(ToastComponent);
