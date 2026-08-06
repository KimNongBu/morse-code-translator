/**
 * 아직 문자로 확정되지 않은 현재 입력 버퍼를 보여주는 카드.
 * 확정되면 자동으로 비워지므로, 사용자에게 "지금 무엇을 치고 있는지"를 알려주는 역할이다.
 */

import { memo } from 'react';
import type { ReactNode } from 'react';

import { AUTO_LETTER_DELAY, AUTO_WORD_DELAY } from '../utils/morseMap';
import { Card } from './Card';
import styles from './CurrentInput.module.css';

export interface CurrentInputProps {
  /** 현재 입력 중인 기호들 (예: `.-`) */
  buffer: string;
  /** 버퍼가 어떤 문자가 될지 미리보기. 매칭이 없으면 null */
  preview: string | null;
  /** 모스 키가 눌린 상태인지 */
  isPressed: boolean;
  /** 헤더 우측 액션 */
  actions?: ReactNode;
}

function CurrentInputComponent({ buffer, preview, isPressed, actions }: CurrentInputProps) {
  const hasBuffer = buffer.length > 0;

  return (
    <Card
      title="Buffer · Live"
      badge=".-"
      subtitle={`${AUTO_LETTER_DELAY}ms 쉬면 문자 확정 · ${AUTO_WORD_DELAY}ms 더 쉬면 단어 구분`}
      actions={actions}
    >
      <div
        className={isPressed ? `${styles.display} ${styles.listening}` : styles.display}
        role="status"
        aria-live="polite"
        aria-label={hasBuffer ? `현재 입력 ${buffer}` : '입력 대기 중'}
      >
        {hasBuffer ? (
          <span className={styles.buffer}>
            {buffer}
            <span className={styles.caret} aria-hidden="true" />
          </span>
        ) : (
          <span className={styles.placeholder}>buffer empty</span>
        )}

        {hasBuffer && (
          <span className={styles.preview}>
            <span className={styles.previewLabel}>letter</span>
            <span
              className={
                preview === null ? `${styles.previewValue} ${styles.previewUnknown}` : styles.previewValue
              }
            >
              {preview ?? '?'}
            </span>
          </span>
        )}
      </div>

      <p className={styles.hint}>
        {isPressed
          ? '키를 누르고 있습니다 — 떼는 순간 점 또는 선이 입력됩니다'
          : hasBuffer
            ? '잠시 기다리면 자동으로 문자가 완성됩니다'
            : '마우스 · 터치 · Spacebar 로 입력할 수 있습니다'}
      </p>
    </Card>
  );
}

export const CurrentInput = memo(CurrentInputComponent);
