/**
 * 국제 모스부호(International Morse Code) 매핑 테이블과 타이밍 상수.
 *
 * - 영어 -> 모스, 모스 -> 영어 양방향 변환을 위해 두 개의 Map을 제공한다.
 * - 역방향 Map은 정방향 Map에서 파생되므로 항상 동기화가 보장된다.
 */

/** 단어 구분자로 사용하는 토큰. 표준 국제 모스부호 표기법을 따른다. */
export const WORD_SEPARATOR = '/' as const;

/** 점(dot) 기호 */
export const DOT = '.' as const;

/** 선(dash) 기호 */
export const DASH = '-' as const;

/** 모스 기호 하나를 나타내는 타입 */
export type MorseSymbol = typeof DOT | typeof DASH;

/**
 * 모스부호 재생 / 입력 판정에 사용하는 모든 타이밍 값 (단위: ms).
 * 국제 표준(1 unit = dot 길이)을 100ms 기준으로 환산했다.
 */
export const MORSE_TIMING = {
  /** 기본 단위 시간 */
  UNIT: 100,
  /** 점 재생 길이 */
  DOT: 100,
  /** 선 재생 길이 */
  DASH: 300,
  /** 같은 문자 안에서 기호와 기호 사이 간격 */
  SYMBOL_GAP: 100,
  /** 문자와 문자 사이 간격 (기호 간격 포함 총합) */
  LETTER_GAP: 300,
  /** 단어와 단어 사이 간격 (기호 간격 포함 총합) */
  WORD_GAP: 700,
} as const;

/** 모스음 주파수 (Hz) */
export const MORSE_FREQUENCY = 700;

/**
 * 모스 키를 눌렀을 때 점/선을 가르는 기준 시간 (ms).
 * 이 값 이하면 `.`, 초과하면 `-`로 판정한다.
 */
export const DOT_DASH_THRESHOLD = 200;

/** 마지막 입력 후 이 시간이 지나면 현재 버퍼를 한 글자로 확정한다 (ms). */
export const AUTO_LETTER_DELAY = 300;

/** 문자가 확정된 뒤 이 시간이 더 지나면 단어 구분(공백)을 추가한다 (ms). */
export const AUTO_WORD_DELAY = 700;

/**
 * 영어 문자 -> 모스부호 매핑.
 * 필수 지원 범위는 A-Z / 0-9 이며, 자주 쓰이는 문장부호를 확장으로 함께 제공한다.
 */
export const ENGLISH_TO_MORSE: ReadonlyMap<string, string> = new Map<string, string>([
  // --- 알파벳 A-Z ---
  ['A', '.-'],
  ['B', '-...'],
  ['C', '-.-.'],
  ['D', '-..'],
  ['E', '.'],
  ['F', '..-.'],
  ['G', '--.'],
  ['H', '....'],
  ['I', '..'],
  ['J', '.---'],
  ['K', '-.-'],
  ['L', '.-..'],
  ['M', '--'],
  ['N', '-.'],
  ['O', '---'],
  ['P', '.--.'],
  ['Q', '--.-'],
  ['R', '.-.'],
  ['S', '...'],
  ['T', '-'],
  ['U', '..-'],
  ['V', '...-'],
  ['W', '.--'],
  ['X', '-..-'],
  ['Y', '-.--'],
  ['Z', '--..'],

  // --- 숫자 0-9 ---
  ['0', '-----'],
  ['1', '.----'],
  ['2', '..---'],
  ['3', '...--'],
  ['4', '....-'],
  ['5', '.....'],
  ['6', '-....'],
  ['7', '--...'],
  ['8', '---..'],
  ['9', '----.'],

  // --- 확장: 문장부호 ---
  ['.', '.-.-.-'],
  [',', '--..--'],
  ['?', '..--..'],
  ["'", '.----.'],
  ['!', '-.-.--'],
  ['/', '-..-.'],
  ['(', '-.--.'],
  [')', '-.--.-'],
  ['&', '.-...'],
  [':', '---...'],
  [';', '-.-.-.'],
  ['=', '-...-'],
  ['+', '.-.-.'],
  ['-', '-....-'],
  ['_', '..--.-'],
  ['"', '.-..-.'],
  ['$', '...-..-'],
  ['@', '.--.-.'],
]);

/**
 * 모스부호 -> 영어 문자 매핑.
 * `ENGLISH_TO_MORSE`를 뒤집어 생성하므로 두 테이블은 항상 일치한다.
 */
export const MORSE_TO_ENGLISH: ReadonlyMap<string, string> = new Map<string, string>(
  Array.from(ENGLISH_TO_MORSE, ([character, code]): [string, string] => [code, character]),
);

/** 해당 문자를 모스부호로 변환할 수 있는지 확인한다. */
export function isSupportedCharacter(character: string): boolean {
  return ENGLISH_TO_MORSE.has(character.toUpperCase());
}
