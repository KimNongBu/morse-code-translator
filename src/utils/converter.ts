/**
 * 영어 <-> 모스부호 양방향 변환 로직.
 *
 * 표기 규칙
 * - 문자와 문자 사이는 공백 한 칸: `.... . .-.. .-.. ---`
 * - 단어와 단어 사이는 ` / `:     `... --- ... / -- .-- ...`
 */

import { ENGLISH_TO_MORSE, MORSE_TO_ENGLISH, WORD_SEPARATOR } from './morseMap';

/** 변환할 수 없는 모스 토큰을 표시할 때 사용하는 문자 */
export const UNKNOWN_CHARACTER = '?';

/** 영어 -> 모스 변환 결과 */
export interface TextToMorseResult {
  /** 변환된 모스부호 문자열 */
  morse: string;
  /** 매핑 테이블에 없어 변환에서 제외된 문자 목록(중복 제거) */
  unsupported: string[];
}

/**
 * 영어 문자열을 모스부호로 변환한다.
 * 대소문자를 구분하지 않으며, 지원하지 않는 문자는 결과에서 제외하고 `unsupported`로 보고한다.
 */
export function textToMorse(text: string): TextToMorseResult {
  const unsupported = new Set<string>();

  const words = text
    .toUpperCase()
    .split(/\s+/) // 연속 공백은 단어 하나의 구분으로 취급
    .filter((word) => word.length > 0);

  const encodedWords = words.map((word) => {
    const codes: string[] = [];

    for (const character of word) {
      const code = ENGLISH_TO_MORSE.get(character);
      if (code === undefined) {
        unsupported.add(character);
        continue;
      }
      codes.push(code);
    }

    return codes.join(' ');
  });

  const morse = encodedWords
    .filter((word) => word.length > 0)
    .join(` ${WORD_SEPARATOR} `);

  return { morse, unsupported: Array.from(unsupported) };
}

/**
 * 편의용 래퍼. 변환된 모스부호 문자열만 필요할 때 사용한다.
 */
export function toMorse(text: string): string {
  return textToMorse(text).morse;
}

/**
 * 모스부호 문자열을 영어로 변환한다.
 *
 * 입력 형태에 관대하게 동작한다.
 * - `/` 뿐 아니라 공백 3칸 이상도 단어 구분으로 인식
 * - 매핑에 없는 토큰은 `?`로 대체
 */
export function morseToText(morse: string): string {
  const normalized = morse.trim();
  if (normalized.length === 0) return '';

  const words = normalized
    // 공백 3칸 이상 = 단어 구분. 표준 `/` 표기로 통일한다.
    .replace(/ {3,}/g, ` ${WORD_SEPARATOR} `)
    .split(WORD_SEPARATOR);

  return words
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter((token) => token.length > 0)
        .map((token) => MORSE_TO_ENGLISH.get(token) ?? UNKNOWN_CHARACTER)
        .join(''),
    )
    .filter((word) => word.length > 0)
    .join(' ');
}

/**
 * 모스 토큰 하나를 문자로 변환한다. 미완성 입력 미리보기에 사용한다.
 * 매핑에 없으면 `null`을 반환한다.
 */
export function decodeSingleToken(token: string): string | null {
  if (token.length === 0) return null;
  return MORSE_TO_ENGLISH.get(token) ?? null;
}

/** 모스 문자열 안의 토큰 하나와 원본 문자열에서의 시작 위치 */
export interface MorseToken {
  /** 토큰 문자열 (`.-` 또는 단어 구분자 `/`) */
  value: string;
  /** 원본 모스 문자열에서의 시작 인덱스 */
  start: number;
  /** 단어 구분자 여부 */
  isSeparator: boolean;
}

/**
 * 모스 문자열을 토큰 단위로 쪼개면서 각 토큰의 원본 인덱스를 함께 반환한다.
 * 재생 중인 기호를 하이라이트할 때 인덱스가 필요하기 때문에 별도 함수로 분리했다.
 */
export function tokenizeMorse(morse: string): MorseToken[] {
  const tokens: MorseToken[] = [];
  let cursor = 0;

  while (cursor < morse.length) {
    if (morse[cursor] === ' ') {
      cursor += 1;
      continue;
    }

    let end = cursor;
    while (end < morse.length && morse[end] !== ' ') {
      end += 1;
    }

    const value = morse.slice(cursor, end);
    tokens.push({ value, start: cursor, isSeparator: value === WORD_SEPARATOR });
    cursor = end;
  }

  return tokens;
}

/**
 * 확정된 모스 문자열 뒤에 새 문자(토큰)를 덧붙인다.
 */
export function appendToken(morse: string, token: string): string {
  if (token.length === 0) return morse;
  return morse.length === 0 ? token : `${morse} ${token}`;
}

/**
 * 모스 문자열에서 마지막 토큰 하나를 제거한다.
 */
export function removeLastToken(morse: string): string {
  const tokens = tokenizeMorse(morse);
  if (tokens.length === 0) return '';
  return tokens
    .slice(0, -1)
    .map((token) => token.value)
    .join(' ');
}

/** 마지막 토큰이 단어 구분자인지 확인한다. */
export function endsWithSeparator(morse: string): boolean {
  const tokens = tokenizeMorse(morse);
  const last = tokens.at(-1);
  return last !== undefined && last.isSeparator;
}
