/**
 * Web Audio API 기반 모스음 재생 엔진.
 *
 * 두 가지 재생 모드를 제공한다.
 * 1. `playMorse()`  - 모스 문자열 전체를 스케줄링해서 자동 재생 (취소 가능)
 * 2. `startTone()` / `stopTone()` - 모스 키를 누르고 있는 동안의 수동 발음
 *
 * 오실레이터를 미리 스케줄링하기 때문에 setTimeout 기반 재생보다 타이밍이 정확하다.
 */

import { MORSE_FREQUENCY, MORSE_TIMING, WORD_SEPARATOR } from './morseMap';

/** 클릭 노이즈를 없애기 위한 게인 램프 시간 (초) */
const RAMP_SECONDS = 0.005;

/** 스케줄링 여유 시간 (초). 첫 음이 잘리는 것을 방지한다. */
const SCHEDULE_LEAD_SECONDS = 0.06;

/** 재생 스케줄 상의 소리 한 개 */
export interface ToneEvent {
  /** 재생 시작 시각 (ms, 시퀀스 시작 기준) */
  startMs: number;
  /** 소리 길이 (ms) */
  durationMs: number;
  /** 원본 모스 문자열에서 이 소리에 해당하는 문자 인덱스 */
  charIndex: number;
}

/** 모스 문자열 하나에 대한 전체 재생 스케줄 */
export interface ToneSchedule {
  events: ToneEvent[];
  totalMs: number;
}

/**
 * 모스 문자열을 재생 스케줄로 변환한다.
 *
 * 간격 규칙
 * - 기호 사이: 100ms
 * - 문자 사이: 300ms (기호 간격 포함)
 * - 단어 사이: 700ms (기호 간격 포함)
 */
export function buildSchedule(morse: string): ToneSchedule {
  const events: ToneEvent[] = [];
  let cursorMs = 0;
  /** 직전에 소리를 낸 적이 있는지 (맨 앞 무음 방지) */
  let hasPrevious = false;

  for (let index = 0; index < morse.length; index += 1) {
    const character = morse[index];

    if (character === '.' || character === '-') {
      if (hasPrevious) cursorMs += MORSE_TIMING.SYMBOL_GAP;
      const durationMs = character === '.' ? MORSE_TIMING.DOT : MORSE_TIMING.DASH;
      events.push({ startMs: cursorMs, durationMs, charIndex: index });
      cursorMs += durationMs;
      hasPrevious = true;
      continue;
    }

    if (character === WORD_SEPARATOR) {
      // 단어 구분: 무음 총 700ms.
      // 다음 기호를 만나면 SYMBOL_GAP(100ms)이 한 번 더 더해지므로 그만큼 빼둔다.
      if (hasPrevious) cursorMs += MORSE_TIMING.WORD_GAP - MORSE_TIMING.SYMBOL_GAP;
      continue;
    }

    if (character === ' ') {
      // 공백 하나 = 문자 구분: 무음 총 300ms. 위와 같은 이유로 SYMBOL_GAP을 빼둔다.
      // 단어 구분자 양옆의 공백은 위에서 이미 처리했으므로 중복 가산하지 않는다.
      const isAroundSeparator =
        morse[index - 1] === WORD_SEPARATOR || morse[index + 1] === WORD_SEPARATOR;
      if (hasPrevious && !isAroundSeparator) {
        cursorMs += MORSE_TIMING.LETTER_GAP - MORSE_TIMING.SYMBOL_GAP;
      }
    }
  }

  return { events, totalMs: cursorMs };
}

/** `playMorse()` 호출 시 전달할 수 있는 콜백들 */
export interface PlayOptions {
  /** 재생이 정상적으로 끝났을 때 호출 */
  onEnd?: () => void;
  /**
   * 재생 위치가 바뀔 때마다 호출.
   * 현재 소리나는 기호의 원본 문자열 인덱스를 전달한다.
   */
  onProgress?: (charIndex: number | null) => void;
}

/**
 * 모스음 재생기.
 *
 * AudioContext는 브라우저당 개수 제한이 있으므로 인스턴스 하나를 재사용한다.
 * 최초 사용자 제스처 이전에는 컨텍스트가 suspended 상태일 수 있어 매번 resume을 시도한다.
 */
export class MorseAudioEngine {
  private context: AudioContext | null = null;

  /** 자동 재생용 오실레이터 */
  private playbackOscillator: OscillatorNode | null = null;

  /** 모스 키 수동 발음용 오실레이터 */
  private manualOscillator: OscillatorNode | null = null;
  private manualGain: GainNode | null = null;

  /** 재생 세션 식별자. 취소된 재생의 콜백을 무시하는 데 사용한다. */
  private playbackToken = 0;

  /** 진행률 추적용 requestAnimationFrame 핸들 */
  private progressFrame: number | null = null;

  private volume = 0.25;

  private frequency = MORSE_FREQUENCY;

  /** 현재 자동 재생 중인지 여부 */
  public get isPlaying(): boolean {
    return this.playbackOscillator !== null;
  }

  /** 출력 볼륨을 0~1 범위로 설정한다. */
  public setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));

    // 키를 누르고 있는 중이라면 즉시 반영한다.
    if (this.manualGain && this.context) {
      const now = this.context.currentTime;
      this.manualGain.gain.cancelScheduledValues(now);
      this.manualGain.gain.linearRampToValueAtTime(this.volume, now + RAMP_SECONDS);
    }
  }

  /** 모스음 주파수(Hz)를 설정한다. */
  public setFrequency(value: number): void {
    this.frequency = value;
  }

  /**
   * 오디오 컨텍스트를 확보한다.
   * 브라우저 자동재생 정책 때문에 사용자 제스처 시점에 미리 호출해두면 좋다.
   */
  public unlock(): void {
    const context = this.getContext();
    if (context.state === 'suspended') {
      void context.resume();
    }
  }

  /**
   * 모스 문자열을 처음부터 재생한다.
   * 이전 재생이 있다면 즉시 취소한다.
   */
  public playMorse(morse: string, options: PlayOptions = {}): void {
    this.stop();

    const { events, totalMs } = buildSchedule(morse);
    if (events.length === 0) {
      options.onEnd?.();
      return;
    }

    const context = this.getContext();
    if (context.state === 'suspended') {
      void context.resume();
    }

    const token = ++this.playbackToken;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(this.frequency, context.currentTime);
    gain.gain.setValueAtTime(0, context.currentTime);
    oscillator.connect(gain).connect(context.destination);

    const startTime = context.currentTime + SCHEDULE_LEAD_SECONDS;

    // 각 소리마다 게인 엔벨로프를 미리 예약한다.
    for (const event of events) {
      const soundStart = startTime + event.startMs / 1000;
      const soundEnd = soundStart + event.durationMs / 1000;
      const attackEnd = Math.min(soundStart + RAMP_SECONDS, soundEnd);
      const releaseStart = Math.max(attackEnd, soundEnd - RAMP_SECONDS);

      gain.gain.setValueAtTime(0, soundStart);
      gain.gain.linearRampToValueAtTime(this.volume, attackEnd);
      gain.gain.setValueAtTime(this.volume, releaseStart);
      gain.gain.linearRampToValueAtTime(0, soundEnd);
    }

    const stopTime = startTime + totalMs / 1000 + RAMP_SECONDS;
    oscillator.start(startTime);
    oscillator.stop(stopTime);

    oscillator.onended = () => {
      // 이미 다른 재생으로 교체되었다면 무시한다.
      if (token !== this.playbackToken) return;
      this.cleanupPlayback();
      options.onProgress?.(null);
      options.onEnd?.();
    };

    this.playbackOscillator = oscillator;

    if (options.onProgress) {
      this.trackProgress(token, startTime, events, options.onProgress);
    }
  }

  /** 자동 재생을 즉시 중단한다. */
  public stop(): void {
    this.playbackToken += 1;
    this.cleanupPlayback();
  }

  /** 모스 키를 누르는 동안의 연속음을 시작한다. */
  public startTone(): void {
    if (this.manualOscillator) return;

    const context = this.getContext();
    if (context.state === 'suspended') {
      void context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(this.frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume, now + RAMP_SECONDS);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);

    this.manualOscillator = oscillator;
    this.manualGain = gain;
  }

  /** 모스 키 연속음을 멈춘다. */
  public stopTone(): void {
    const oscillator = this.manualOscillator;
    const gain = this.manualGain;
    if (!oscillator || !gain || !this.context) return;

    this.manualOscillator = null;
    this.manualGain = null;

    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    // 현재 게인 값에서 부드럽게 0으로 떨어뜨려 클릭음을 방지한다.
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + RAMP_SECONDS);
    oscillator.stop(now + RAMP_SECONDS * 2);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  /** 엔진이 사용하던 리소스를 모두 해제한다. (컴포넌트 언마운트 시 호출) */
  public dispose(): void {
    this.stop();
    this.stopTone();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }

  /** AudioContext를 지연 생성한다. */
  private getContext(): AudioContext {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext();
    }
    return this.context;
  }

  /** 재생 중인 노드와 애니메이션 프레임을 정리한다. */
  private cleanupPlayback(): void {
    if (this.progressFrame !== null) {
      cancelAnimationFrame(this.progressFrame);
      this.progressFrame = null;
    }

    const oscillator = this.playbackOscillator;
    if (!oscillator) return;
    this.playbackOscillator = null;

    oscillator.onended = null;
    try {
      oscillator.stop();
    } catch {
      // 이미 정지된 오실레이터는 무시한다.
    }
    oscillator.disconnect();
  }

  /**
   * requestAnimationFrame으로 재생 위치를 추적해 현재 기호 인덱스를 알린다.
   * 상태 갱신은 값이 바뀔 때만 하므로 불필요한 리렌더링이 발생하지 않는다.
   */
  private trackProgress(
    token: number,
    startTime: number,
    events: ToneEvent[],
    onProgress: (charIndex: number | null) => void,
  ): void {
    let lastIndex: number | null = null;

    const tick = (): void => {
      if (token !== this.playbackToken || !this.context) return;

      const elapsedMs = (this.context.currentTime - startTime) * 1000;
      let current: number | null = null;

      for (const event of events) {
        if (elapsedMs >= event.startMs && elapsedMs < event.startMs + event.durationMs) {
          current = event.charIndex;
          break;
        }
      }

      if (current !== lastIndex) {
        lastIndex = current;
        onProgress(current);
      }

      this.progressFrame = requestAnimationFrame(tick);
    };

    this.progressFrame = requestAnimationFrame(tick);
  }
}
