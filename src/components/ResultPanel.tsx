/**
 * 모스 키로 입력한 결과를 모스 문자열 / 영문 문자열 두 가지로 동시에 보여준다.
 * 각 줄마다 복사 버튼을 제공한다.
 */

import { memo, useCallback } from 'react';

import { Button } from './Button';
import { Card } from './Card';
import styles from './ResultPanel.module.css';

export interface ResultPanelProps {
  /** 확정된 모스 문자열 */
  morse: string;
  /** 해석된 영어 문자열 */
  text: string;
  /** 모스 복사 */
  onCopyMorse: () => void;
  /** 영어 복사 */
  onCopyText: () => void;
  /** 번역기 입력창으로 결과 보내기 */
  onSendToTranslator: () => void;
}

function ResultPanelComponent({
  morse,
  text,
  onCopyMorse,
  onCopyText,
  onSendToTranslator,
}: ResultPanelProps) {
  const hasResult = morse.trim().length > 0;

  // 결과가 없을 때 액션 버튼을 눌러도 아무 일이 없도록 방지한다.
  const handleSend = useCallback((): void => {
    if (!hasResult) return;
    onSendToTranslator();
  }, [hasResult, onSendToTranslator]);

  return (
    <Card
      title="Decode · Result"
      badge=".-."
      subtitle="키 입력이 모스와 영문으로 실시간 변환됩니다"
      actions={
        <Button variant="quiet" icon="↑" onClick={handleSend} disabled={!hasResult}>
          send to input
        </Button>
      }
    >
      <div className={styles.rows}>
        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <span className={styles.rowLabel}>Morse</span>
            <Button variant="quiet" icon="⧉" onClick={onCopyMorse} disabled={!hasResult}>
              copy
            </Button>
          </div>
          <p className={`${styles.value} ${styles.morseValue}`}>
            {hasResult ? morse : <span className={styles.empty}>no signal</span>}
          </p>
        </div>

        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <span className={styles.rowLabel}>English</span>
            <Button variant="quiet" icon="⧉" onClick={onCopyText} disabled={text.length === 0}>
              복사
            </Button>
          </div>
          <p className={`${styles.value} ${styles.textValue}`}>
            {text.length > 0 ? text : <span className={styles.empty}>no data</span>}
          </p>
        </div>
      </div>
    </Card>
  );
}

export const ResultPanel = memo(ResultPanelComponent);
