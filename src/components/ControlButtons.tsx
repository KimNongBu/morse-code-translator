/**
 * 번역기 하단 컨트롤 바.
 * 재생(Play / Stop / Replay), 초기화, 복사, 자동 재생 토글, 볼륨을 담당한다.
 */

import { memo, useCallback } from 'react';
import type { ChangeEvent } from 'react';

import { Button } from './Button';
import styles from './ControlButtons.module.css';

export interface ControlButtonsProps {
  /** 재생 중인지 여부 */
  isPlaying: boolean;
  /** 재생할 내용이 있는지 여부 */
  canPlay: boolean;
  /** 지울 내용이 있는지 여부 */
  canClear: boolean;
  /** 입력 변경 시 자동 재생 여부 */
  isAutoPlay: boolean;
  /** 현재 볼륨 (0~1) */
  volume: number;
  /** 음소거 여부 */
  isMuted: boolean;

  onPlay: () => void;
  onStop: () => void;
  onReplay: () => void;
  onClear: () => void;
  onCopyMorse: () => void;
  onCopyText: () => void;
  onToggleAutoPlay: () => void;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}

function ControlButtonsComponent({
  isPlaying,
  canPlay,
  canClear,
  isAutoPlay,
  volume,
  isMuted,
  onPlay,
  onStop,
  onReplay,
  onClear,
  onCopyMorse,
  onCopyText,
  onToggleAutoPlay,
  onVolumeChange,
  onToggleMute,
}: ControlButtonsProps) {
  const handleVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onVolumeChange(Number(event.target.value) / 100);
    },
    [onVolumeChange],
  );

  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        <Button variant="primary" icon="▶" onClick={onPlay} disabled={!canPlay || isPlaying}>
          play
        </Button>
        <Button icon="■" onClick={onStop} disabled={!isPlaying} isActive={isPlaying}>
          stop
        </Button>
        <Button icon="↻" onClick={onReplay} disabled={!canPlay}>
          replay
        </Button>
        <Button variant="danger" icon="✕" onClick={onClear} disabled={!canClear}>
          clear
        </Button>
      </div>

      <div className={styles.group}>
        <Button icon="⧉" onClick={onCopyMorse} disabled={!canPlay}>
          cp morse
        </Button>
        <Button icon="⧉" onClick={onCopyText} disabled={!canClear}>
          cp text
        </Button>

        <label className={isAutoPlay ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={isAutoPlay}
            onChange={onToggleAutoPlay}
          />
          <span className={styles.checkMark} aria-hidden="true">
            [{isAutoPlay ? 'x' : ' '}]
          </span>
          autoplay
        </label>

        <div className={styles.volume}>
          <Button
            variant="quiet"
            onClick={onToggleMute}
            aria-label={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? '🔇' : '🔊'}
          </Button>
          <input
            type="range"
            className={styles.slider}
            min={0}
            max={100}
            value={Math.round((isMuted ? 0 : volume) * 100)}
            onChange={handleVolumeChange}
            aria-label="볼륨"
          />
        </div>
      </div>
    </div>
  );
}

export const ControlButtons = memo(ControlButtonsComponent);
