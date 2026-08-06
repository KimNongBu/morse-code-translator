/**
 * 변환된 모스부호를 큰 글씨로 보여주는 카드.
 *
 * - 문자 단위(토큰)로 묶어 출력하고, 각 토큰 위에 해석된 알파벳을 표시한다.
 * - 재생 중에는 현재 소리나는 기호를 하이라이트한다.
 */

import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';

import { decodeSingleToken, tokenizeMorse } from '../utils/converter';
import { Card } from './Card';
import styles from './MorseOutput.module.css';

export interface MorseOutputProps {
  /** 표시할 모스부호 문자열 */
  morse: string;
  /** 지금 소리나는 기호의 문자열 인덱스. 없으면 null */
  playingIndex: number | null;
  /** 자동 재생 중인지 여부 */
  isPlaying: boolean;
  /** 헤더 우측에 배치할 액션 (복사 버튼 등) */
  actions?: ReactNode;
}

function MorseOutputComponent({ morse, playingIndex, isPlaying, actions }: MorseOutputProps) {
  // 토큰 분해는 문자열이 바뀔 때만 수행한다.
  // (재생 하이라이트가 갱신될 때마다 다시 계산하지 않기 위해)
  const tokens = useMemo(() => tokenizeMorse(morse), [morse]);

  const symbolCount = useMemo(
    () => Array.from(morse).filter((character) => character === '.' || character === '-').length,
    [morse],
  );

  const outputClassName = [styles.output, isPlaying ? styles.playing : '']
    .filter(Boolean)
    .join(' ');

  return (
    <Card
      title="Output · Morse"
      badge="-- ---"
      subtitle="문자 위에 해석된 알파벳이 함께 표시됩니다"
      actions={actions}
    >
      <div className={outputClassName}>
        {tokens.length === 0 ? (
          <p className={styles.empty}>awaiting input</p>
        ) : (
          <p className={styles.tokens} aria-label={`모스부호 ${morse}`}>
            {tokens.map((token) =>
              token.isSeparator ? (
                <span key={token.start} className={styles.separator} aria-hidden="true">
                  /
                </span>
              ) : (
                <span
                  key={token.start}
                  className={styles.token}
                  data-letter={decodeSingleToken(token.value) ?? '?'}
                >
                  {Array.from(token.value, (symbol, offset) => {
                    const absoluteIndex = token.start + offset;
                    const isActive = absoluteIndex === playingIndex;
                    return (
                      <span
                        key={absoluteIndex}
                        className={isActive ? `${styles.symbol} ${styles.symbolActive}` : styles.symbol}
                      >
                        {symbol}
                      </span>
                    );
                  })}
                </span>
              ),
            )}
          </p>
        )}
      </div>

      <div className={styles.meta}>
        {isPlaying ? (
          <span className={styles.status} role="status">
            <span className={styles.lamp} aria-hidden="true" />
            transmitting
          </span>
        ) : (
          <span>tone 700hz · dot 100ms · dash 300ms</span>
        )}
        <span className={styles.count}>sym {String(symbolCount).padStart(3, '0')}</span>
      </div>
    </Card>
  );
}

export const MorseOutput = memo(MorseOutputComponent);
