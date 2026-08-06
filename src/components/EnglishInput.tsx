/**
 * 영어 입력 카드.
 * 입력 즉시(onChange) 상위로 값을 올려 실시간 변환이 이뤄지도록 한다.
 */

import { memo, useCallback, useId } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';

import { EXAMPLE_PHRASES, MAX_INPUT_LENGTH } from '../constants';
import { Button } from './Button';
import { Card } from './Card';
import styles from './EnglishInput.module.css';

export interface EnglishInputProps {
  /** 현재 입력값 */
  value: string;
  /** 입력이 바뀔 때 호출된다 */
  onChange: (value: string) => void;
  /** 모스로 변환할 수 없어 무시된 문자 목록 */
  unsupported: string[];
  /** 예제 버튼을 눌렀을 때 */
  onSelectExample: (phrase: string) => void;
  /** 입력 가능한 최대 길이 */
  maxLength?: number;
}

function EnglishInputComponent({
  value,
  onChange,
  unsupported,
  onSelectExample,
  maxLength = MAX_INPUT_LENGTH,
}: EnglishInputProps) {
  const textareaId = useId();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      onChange(event.target.value);
    },
    [onChange],
  );

  // 예제 버튼마다 익명 함수를 만들면 Button의 memo가 무의미해지므로
  // data 속성으로 값을 전달하고 핸들러 하나를 공유한다.
  const handleExampleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const phrase = event.currentTarget.dataset.phrase;
      if (phrase !== undefined) onSelectExample(phrase);
    },
    [onSelectExample],
  );

  return (
    <Card
      title="Input · Plain"
      badge=".-"
      subtitle="영문과 숫자를 입력하면 즉시 모스부호로 변환됩니다"
    >
      <label className={styles.srOnly} htmlFor={textareaId}>
        변환할 영어 문장
      </label>

      <div className={styles.terminal}>
        <div className={styles.terminalBar}>
          <span>stdin.txt</span>
          <span className={styles.terminalDots} aria-hidden="true">
            □ □ □
          </span>
        </div>
        <div className={styles.terminalBody}>
          <span className={styles.prompt} aria-hidden="true">
            &gt;
          </span>
          <textarea
            id={textareaId}
            className={styles.textarea}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            placeholder="HELLO WORLD"
            spellCheck={false}
            autoComplete="off"
            aria-describedby={unsupported.length > 0 ? `${textareaId}-warning` : undefined}
          />
        </div>
      </div>

      <div className={styles.meta}>
        {unsupported.length > 0 ? (
          <span className={styles.warning} id={`${textareaId}-warning`} role="status">
            지원하지 않는 문자는 제외됩니다:{' '}
            <span className={styles.warningChars}>{unsupported.join(' ')}</span>
          </span>
        ) : (
          <span>charset · A-Z · 0-9 · space</span>
        )}
        <span className={styles.count}>
          {String(value.length).padStart(3, '0')} / {maxLength}
        </span>
      </div>

      <div className={styles.examples}>
        <span className={styles.examplesLabel}>load</span>
        {EXAMPLE_PHRASES.map((phrase) => (
          <Button
            key={phrase}
            variant="quiet"
            data-phrase={phrase}
            onClick={handleExampleClick}
            aria-label={`예제 문구 ${phrase} 불러오기`}
          >
            {phrase}
          </Button>
        ))}
      </div>
    </Card>
  );
}

export const EnglishInput = memo(EnglishInputComponent);
