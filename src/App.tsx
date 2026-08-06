/**
 * Morse Code Translator — 애플리케이션 루트.
 *
 * 두 개의 독립적인 작업 영역으로 구성된다.
 * 1. Translator : 영어를 입력하면 실시간으로 모스부호 + 모스음으로 변환
 * 2. Morse Key  : 실제 전신기처럼 눌러서 입력하고, 모스/영문을 실시간 해석
 *
 * 상태 관리와 부수 효과는 모두 hooks/, 순수 변환 로직은 utils/ 에 있고
 * 여기서는 그것들을 조립하는 역할만 한다.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from './components/Button';
import { ControlButtons } from './components/ControlButtons';
import { CurrentInput } from './components/CurrentInput';
import { EnglishInput } from './components/EnglishInput';
import { MorseKey } from './components/MorseKey';
import { MorseOutput } from './components/MorseOutput';
import { ResultPanel } from './components/ResultPanel';
import { Toast } from './components/Toast';
import { useClipboard } from './hooks/useClipboard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMorseAudio } from './hooks/useMorseAudio';
import { useMorseInput } from './hooks/useMorseInput';
import { textToMorse } from './utils/converter';
import styles from './App.module.css';

/**
 * 자동 재생 대기 시간 (ms).
 * 타이핑 도중 매 글자마다 재생이 재시작되면 소리가 끊기기만 하므로,
 * 잠깐 멈췄을 때 처음부터 다시 재생한다.
 */
const AUTO_PLAY_DEBOUNCE = 350;

export default function App() {
  // --- 번역기(영어 -> 모스) 상태 ---
  const [englishText, setEnglishText] = useState('');
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // --- 오디오 ---
  const audio = useMorseAudio();
  const { play, stop, startTone, stopTone, unlock } = audio;

  // --- 모스 키 입력 ---
  const morseInput = useMorseInput({ onPressStart: startTone, onPressEnd: stopTone });

  // --- 클립보드 / 토스트 ---
  const { message: toastMessage, copy, notify } = useClipboard();

  // 영어 -> 모스 변환은 입력이 바뀔 때만 수행한다.
  const { morse: translatedMorse, unsupported } = useMemo(
    () => textToMorse(englishText),
    [englishText],
  );

  const hasTranslation = translatedMorse.length > 0;
  const hasEnglishText = englishText.trim().length > 0;

  /**
   * 자동 재생: 입력이 바뀌면 기존 재생을 취소하고 새 내용을 처음부터 재생한다.
   * cleanup에서 타이머를 지우므로 연타 중에는 재생이 시작되지 않는다.
   */
  useEffect(() => {
    if (!isAutoPlay) return;

    if (!hasTranslation) {
      stop();
      return;
    }

    const timeoutId = window.setTimeout(() => play(translatedMorse), AUTO_PLAY_DEBOUNCE);
    return () => window.clearTimeout(timeoutId);
  }, [translatedMorse, hasTranslation, isAutoPlay, play, stop]);

  // 브라우저 자동재생 정책 때문에, 첫 사용자 제스처 시점에 AudioContext를 깨워둔다.
  useEffect(() => {
    const handleFirstGesture = (): void => unlock();
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [unlock]);

  // --- 번역기 컨트롤 핸들러 ---

  const handlePlay = useCallback((): void => {
    play(translatedMorse);
  }, [play, translatedMorse]);

  const handleReplay = useCallback((): void => {
    stop();
    play(translatedMorse);
  }, [play, stop, translatedMorse]);

  const handleClearTranslator = useCallback((): void => {
    stop();
    setEnglishText('');
  }, [stop]);

  const handleCopyTranslatedMorse = useCallback((): void => {
    void copy(translatedMorse, '모스부호를');
  }, [copy, translatedMorse]);

  const handleCopyEnglishText = useCallback((): void => {
    void copy(englishText, '영어 문장을');
  }, [copy, englishText]);

  const handleToggleAutoPlay = useCallback((): void => {
    const next = !isAutoPlay;
    setIsAutoPlay(next);
    // 자동 재생을 끄는 순간 재생 중이던 소리도 멈춘다.
    if (!next) stop();
  }, [isAutoPlay, stop]);

  const handleSelectExample = useCallback((phrase: string): void => {
    setEnglishText(phrase);
  }, []);

  // --- 모스 키 패널 핸들러 ---

  const handleCopyKeyedMorse = useCallback((): void => {
    void copy(morseInput.morse, '모스부호를');
  }, [copy, morseInput.morse]);

  const handleCopyKeyedText = useCallback((): void => {
    void copy(morseInput.text, '해석 결과를');
  }, [copy, morseInput.text]);

  /** 키로 입력한 결과를 위쪽 번역기 입력창으로 옮긴다. */
  const handleSendToTranslator = useCallback((): void => {
    const decoded = morseInput.text;
    if (decoded.length === 0) return;
    setEnglishText(decoded);
    notify('번역기로 보냈습니다');
  }, [morseInput.text, notify]);

  // --- 단축키 ---

  /**
   * Ctrl+C는 "현재 모스"를 복사한다.
   * 키로 입력한 내용이 있으면 그쪽을, 없으면 번역 결과를 복사한다.
   */
  const handleCopyShortcut = useCallback((): void => {
    const target = morseInput.morse.length > 0 ? morseInput.morse : translatedMorse;
    void copy(target, '모스부호를');
  }, [copy, morseInput.morse, translatedMorse]);

  /** ESC: 번역기와 키 입력을 모두 초기화한다. */
  const handleResetAll = useCallback((): void => {
    stop();
    setEnglishText('');
    morseInput.clear();
    notify('전체 초기화되었습니다');
  }, [stop, morseInput, notify]);

  useKeyboardShortcuts({
    onKeyDown: morseInput.pressStart,
    onKeyUp: morseInput.pressEnd,
    onBackspace: morseInput.backspace,
    onEscape: handleResetAll,
    onCopy: handleCopyShortcut,
  });

  return (
    <div className={styles.app}>
      {/* 터미널 상단 상태 바 */}
      <div className={styles.topbar}>
        <span className={styles.topbarLeft}>
          MORSE.TRANSLATOR
          <span className={styles.cursor} aria-hidden="true" />
        </span>
        <span className={styles.topbarRight}>
          {audio.isPlaying ? 'TX · ACTIVE' : morseInput.isPressed ? 'KEY · DOWN' : 'IDLE · READY'}
        </span>
      </div>

      <header className={styles.header}>
        <p className={styles.bootLine}>system check ... ok</p>
        <p className={styles.shellLine}>&gt;_ operator shell · cw</p>
        <h1 className={styles.title}>Morse Code Translator</h1>
        <p className={styles.subtitle}>영어 ↔ 모스부호 실시간 변환</p>
        <p className={styles.tagline}>
          입력하면 즉시 부호와 소리로 바뀌고, 실제 전신기처럼 직접 두드려 넣을 수도 있습니다.
        </p>

        <div className={styles.specStrip}>
          <span className={styles.spec}>
            dot <span className={styles.specValue}>100ms</span>
          </span>
          <span className={styles.spec}>
            dash <span className={styles.specValue}>300ms</span>
          </span>
          <span className={styles.spec}>
            char <span className={styles.specValue}>300ms</span>
          </span>
          <span className={styles.spec}>
            word <span className={styles.specValue}>700ms</span>
          </span>
          <span className={styles.spec}>
            tone <span className={styles.specValue}>700hz</span>
          </span>
        </div>
      </header>

      {/* ===== 기능 1 · 2 : 영어 -> 모스부호 + 소리 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionHead}>
          Translator
          <span className={styles.rule} aria-hidden="true" />
          <span className={styles.sectionMeta}>en → morse</span>
        </h2>

        <div className={styles.grid}>
          <EnglishInput
            value={englishText}
            onChange={setEnglishText}
            unsupported={unsupported}
            onSelectExample={handleSelectExample}
          />
          <MorseOutput
            morse={translatedMorse}
            playingIndex={audio.playingIndex}
            isPlaying={audio.isPlaying}
          />
        </div>

        <ControlButtons
          isPlaying={audio.isPlaying}
          canPlay={hasTranslation}
          canClear={hasEnglishText}
          isAutoPlay={isAutoPlay}
          volume={audio.volume}
          isMuted={audio.isMuted}
          onPlay={handlePlay}
          onStop={stop}
          onReplay={handleReplay}
          onClear={handleClearTranslator}
          onCopyMorse={handleCopyTranslatedMorse}
          onCopyText={handleCopyEnglishText}
          onToggleAutoPlay={handleToggleAutoPlay}
          onVolumeChange={audio.setVolume}
          onToggleMute={audio.toggleMute}
        />
      </section>

      {/* ===== 기능 3~7 : 모스 키 입력 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionHead}>
          Morse Key
          <span className={styles.rule} aria-hidden="true" />
          <span className={styles.sectionMeta}>manual · morse → en</span>
        </h2>

        <MorseKey
          isPressed={morseInput.isPressed}
          onPressStart={morseInput.pressStart}
          onPressEnd={morseInput.pressEnd}
        />

        <div className={styles.grid}>
          <CurrentInput
            buffer={morseInput.buffer}
            preview={morseInput.bufferPreview}
            isPressed={morseInput.isPressed}
            actions={
              <>
                <Button variant="quiet" icon="⌫" onClick={morseInput.backspace}>
                  del
                </Button>
                <Button variant="quiet" icon="✕" onClick={morseInput.clear}>
                  reset
                </Button>
              </>
            }
          />
          <ResultPanel
            morse={morseInput.morse}
            text={morseInput.text}
            onCopyMorse={handleCopyKeyedMorse}
            onCopyText={handleCopyKeyedText}
            onSendToTranslator={handleSendToTranslator}
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerMorse}>.-. . .- -.. -.-- / - --- / -.- . -.--</p>
        <div className={styles.footerRow}>
          <span>International Morse Code [ITU-R M.1677] :Driver</span>
          <span className={styles.footerRight}>web audio · 700hz sine</span>
        </div>
      </footer>

      <Toast message={toastMessage} />
    </div>
  );
}
