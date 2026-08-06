/**
 * 앱 전역에서 쓰는 표시용 상수.
 * (컴포넌트 파일에서 상수를 export하면 Fast Refresh가 동작하지 않으므로 분리한다.)
 */

/** 예제 버튼에 노출할 문구 */
export const EXAMPLE_PHRASES: readonly string[] = ['HELLO', 'SOS', 'OPENAI', 'CHATGPT'];

/** 영어 입력창의 최대 글자 수 */
export const MAX_INPUT_LENGTH = 500;
