/**
 * 모스음 재생을 담당하는 커스텀 훅.
 *
 * `MorseAudioEngine`(Web Audio API 래퍼)의 수명주기를 React에 맞춰 관리하고,
 * 재생 상태 / 재생 위치를 컴포넌트가 쓸 수 있는 형태로 노출한다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { MorseAudioEngine } from '../utils/audio';

/** 기본 출력 볼륨 (0~1) */
const DEFAULT_VOLUME = 0.25;

/** `useMorseAudio`가 돌려주는 값 */
export interface UseMorseAudioResult {
  /** 자동 재생 중인지 여부 */
  isPlaying: boolean;
  /** 지금 소리나는 기호의 모스 문자열 내 인덱스. 없으면 null */
  playingIndex: number | null;
  /** 현재 볼륨 (0~1) */
  volume: number;
  /** 음소거 여부 */
  isMuted: boolean;
  /** 모스 문자열을 처음부터 재생한다. */
  play: (morse: string) => void;
  /** 재생을 즉시 중단한다. */
  stop: () => void;
  /** 모스 키를 누르는 동안의 연속음을 시작한다. */
  startTone: () => void;
  /** 모스 키 연속음을 멈춘다. */
  stopTone: () => void;
  /** 볼륨을 변경한다. */
  setVolume: (value: number) => void;
  /** 음소거를 토글한다. */
  toggleMute: () => void;
  /** 브라우저 자동재생 정책 해제를 위해 사용자 제스처 시점에 호출한다. */
  unlock: () => void;
}

export function useMorseAudio(): UseMorseAudioResult {
  // 엔진은 컴포넌트 생애 동안 하나만 유지한다 (AudioContext 재사용).
  const engineRef = useRef<MorseAudioEngine | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);

  // play / startTone 이 볼륨 값에 의존하면 슬라이더를 움직일 때마다
  // 콜백 참조가 바뀌어 자동 재생 effect가 다시 돌고 재생이 처음부터 반복된다.
  // 최신 값은 ref로 읽어 콜백 참조를 고정한다.
  const volumeRef = useRef(DEFAULT_VOLUME);
  const isMutedRef = useRef(false);

  /** 현재 적용해야 할 실제 출력 볼륨 */
  const resolveVolume = useCallback((): number => (isMutedRef.current ? 0 : volumeRef.current), []);

  /** 엔진을 지연 생성해 반환한다. */
  const getEngine = useCallback((): MorseAudioEngine => {
    if (!engineRef.current) {
      engineRef.current = new MorseAudioEngine();
      engineRef.current.setVolume(DEFAULT_VOLUME);
    }
    return engineRef.current;
  }, []);

  // 볼륨 / 음소거 상태를 ref와 엔진에 반영한다. (재생 중이면 즉시 적용된다)
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    engineRef.current?.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // 언마운트 시 AudioContext까지 정리한다.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const stop = useCallback((): void => {
    engineRef.current?.stop();
    setIsPlaying(false);
    setPlayingIndex(null);
  }, []);

  const play = useCallback(
    (morse: string): void => {
      const engine = getEngine();
      engine.setVolume(resolveVolume());

      if (morse.trim().length === 0) {
        stop();
        return;
      }

      setIsPlaying(true);
      setPlayingIndex(null);
      engine.playMorse(morse, {
        onEnd: () => {
          setIsPlaying(false);
          setPlayingIndex(null);
        },
        onProgress: setPlayingIndex,
      });
    },
    [getEngine, resolveVolume, stop],
  );

  const startTone = useCallback((): void => {
    const engine = getEngine();
    engine.setVolume(resolveVolume());
    // 키 입력이 시작되면 자동 재생은 중단한다 (소리가 겹치지 않도록).
    engine.stop();
    setIsPlaying(false);
    setPlayingIndex(null);
    engine.startTone();
  }, [getEngine, resolveVolume]);

  const stopTone = useCallback((): void => {
    engineRef.current?.stopTone();
  }, []);

  const setVolume = useCallback((value: number): void => {
    setVolumeState(Math.min(1, Math.max(0, value)));
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback((): void => {
    setIsMuted((previous) => !previous);
  }, []);

  const unlock = useCallback((): void => {
    getEngine().unlock();
  }, [getEngine]);

  return {
    isPlaying,
    playingIndex,
    volume,
    isMuted,
    play,
    stop,
    startTone,
    stopTone,
    setVolume,
    toggleMute,
    unlock,
  };
}
