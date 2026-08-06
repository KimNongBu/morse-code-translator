# Morse Code Translator

영어 ↔ 모스부호를 실시간으로 변환하고, 실제 전신기(Morse Key)처럼 두드려 입력할 수 있는 웹 애플리케이션입니다.

## 기술 스택

| 항목 | 사용 기술 |
| --- | --- |
| 프레임워크 | React 19 (함수형 컴포넌트 전용) |
| 언어 | TypeScript (`any` 미사용, strict) |
| 번들러 | Vite |
| 패키지 매니저 | Yarn |
| 스타일 | CSS Modules (외부 UI 라이브러리 없음) |
| 오디오 | Web Audio API |

## 실행 방법

```bash
yarn install
yarn dev      # 개발 서버
yarn build    # 타입 체크 + 프로덕션 빌드
yarn preview  # 빌드 결과 미리보기
yarn lint     # 정적 분석
```

> **참고 (이 PC 환경)**
> 전역 환경변수 `NODE_ENV=production`이 설정되어 있으면 devDependencies가 설치되지 않아
> `yarn dev`가 실패합니다. 다음처럼 실행하세요.
>
> ```powershell
> $env:NODE_ENV='development'; yarn install; yarn dev
> ```

## 프로젝트 구조

```
src/
 ├── components/          UI 컴포넌트 (역할별로 분리, 각각 *.module.css 동반)
 │    ├── EnglishInput.tsx    영어 입력 카드 + 예제 버튼
 │    ├── MorseOutput.tsx     모스부호 출력 (재생 중 기호 하이라이트)
 │    ├── MorseKey.tsx        150px 모스 키 버튼 (마우스/터치/Space)
 │    ├── CurrentInput.tsx    확정 전 입력 버퍼 표시
 │    ├── ResultPanel.tsx     키 입력 결과 (모스 + 영문)
 │    ├── ControlButtons.tsx  Play/Stop/Replay/Clear/복사/볼륨
 │    ├── Card.tsx            공통 카드 레이아웃
 │    ├── Button.tsx          공통 버튼 (variant 기반)
 │    └── Toast.tsx           복사/안내 토스트
 │
 ├── hooks/               상태 · 부수효과 로직
 │    ├── useMorseAudio.ts        오디오 엔진 수명주기 관리
 │    ├── useMorseInput.ts        모스 키 입력 상태 머신
 │    ├── useTimer.ts             취소 가능한 타이머
 │    ├── useKeyboardShortcuts.ts 전역 단축키
 │    └── useClipboard.ts         복사 + 토스트
 │
 ├── utils/               순수 함수 (React 비의존)
 │    ├── morseMap.ts     매핑 테이블 · 타이밍 상수
 │    ├── converter.ts    영어 ↔ 모스 양방향 변환, 토큰 유틸
 │    └── audio.ts        Web Audio 재생 엔진 + 스케줄 생성
 │
 ├── constants.ts         예제 문구 등 표시용 상수
 ├── App.tsx
 └── main.tsx
```

비즈니스 로직은 `utils/`(순수 함수)와 `hooks/`(상태·부수효과)에 두고,
`components/`는 표시에만 집중하도록 분리했습니다.

## 기능

### 1. 영어 → 모스부호 실시간 변환

좌측 카드에 입력하면 `onChange` 시점에 즉시 우측 카드로 변환됩니다.
대소문자를 구분하지 않고 **A–Z, 0–9, 공백**을 지원하며, 자주 쓰는 문장부호도 확장 지원합니다.
각 모스 문자 위에는 해석된 알파벳이 함께 표시됩니다.

```
HELLO  →  .... . .-.. .-.. ---
```

### 2. 모스음 재생 (Web Audio API)

| 항목 | 값 |
| --- | --- |
| 주파수 | 700 Hz |
| Dot | 100 ms |
| Dash | 300 ms |
| 기호 간격 | 100 ms |
| 문자 간격 | 300 ms |
| 단어 간격 | 700 ms |

오실레이터 게인 엔벨로프를 미리 스케줄링해 `setTimeout`보다 정확한 타이밍을 냅니다.
입력이 바뀌면 기존 재생을 즉시 취소하고 처음부터 다시 재생합니다.
(연속 타이핑 중 소리가 계속 끊기지 않도록 350ms 디바운스를 두었고, 자동 재생은 토글로 끌 수 있습니다.)

### 3. 실제 모스 키 입력

높이 150px의 큰 키 버튼을 **마우스 · 터치 · Spacebar** 로 조작합니다.
Pointer Capture를 사용해 버튼 밖에서 손을 떼도 정상 처리됩니다.

- 누르는 동안: 색 변경 + 눌림 애니메이션 + 링 효과 + 700Hz 연속음
- 하단 게이지가 누른 시간을 실시간 표시 (200ms 지점에 눈금)
- **200ms 이하 → `.` / 200ms 초과 → `-`**

### 4. 자동 문자 완성

마지막 입력 후 **300ms** 동안 추가 입력이 없으면 현재 버퍼(`.-`)를 문자(`A`)로 확정하고 버퍼를 비웁니다.

### 5. 자동 단어 구분

문자가 확정된 뒤 **700ms** 더 입력이 없으면 단어 구분자를 추가합니다.

### 6. 현재 입력 상태

`Current Morse` 카드에 확정 전 버퍼를 실시간 표시하고, 어떤 글자가 될지 미리보기도 함께 보여줍니다.

### 7. 결과 출력

`Result` 카드에 모스 문자열과 영문 문자열을 동시에 출력합니다. `번역기로 보내기`로 위쪽 입력창에 넘길 수 있습니다.

### 8. 지원 문자

국제 모스부호 **A–Z, 0–9** (+ 문장부호 확장). `Map` 객체로 관리하며 역방향 테이블은 정방향에서 파생되어 항상 동기화됩니다.

### 9. UI — 포스포 그린 CRT 터미널

픽셀/터미널 컴퓨터 디자인 언어로 구성했습니다.

- **모노스페이스 전면 적용** · 대문자 + 넓은 자간, `>` 프롬프트와 `■` 섹션 마커
- **둥근 모서리 없음** (`border-radius: 0`) — 픽셀 UI의 기본 규칙
- **카드 네 모서리 브래킷 틱** — 추가 DOM 없이 배경 그라디언트로 그림
- **전면 스캔라인 오버레이** (`body::after`, `mix-blend-mode: multiply`)
- **비트맵 타이틀** — `background-clip: text` + 가로 줄무늬 그라디언트로 글자에 주사선을 새김
- **세그먼트 게이지** — 모스 키 홀드 바와 볼륨 슬라이더를 같은 블록 패턴으로 통일
- **반전 하이라이트** — 재생 중인 기호와 확정될 글자는 초록 배경 + 검정 글자 블록으로 표시
- 키를 누르면 버튼 전체가 초록으로 반전되며 스캔라인이 덧씌워집니다

데스크톱은 좌우 2열, 900px 이하에서는 세로 1열로 전환됩니다.

### 10. 부가 기능

Clear · Replay · Stop · 모스 복사 · 영어 복사 · 볼륨/음소거 · 자동 재생 토글
예제 버튼: `HELLO` `SOS` `OPENAI` `CHATGPT`

### 11. 단축키

| 키 | 동작 |
| --- | --- |
| `Space` | 모스 키 입력 (누른 시간으로 점/선 판정) |
| `Backspace` | 입력 중인 점/선 삭제 (버퍼가 비면 직전 문자 삭제) |
| `Esc` | 전체 초기화 |
| `Ctrl`/`⌘` + `C` | 현재 모스 복사 |

> 텍스트 입력창에 포커스가 있을 때는 일반 타이핑을 방해하지 않도록 단축키가 비활성화됩니다.
> `Ctrl+C`도 사용자가 드래그로 선택한 영역이 있으면 브라우저 기본 복사를 그대로 존중합니다.

## 구현 노트

- **리렌더링 최소화** — 컴포넌트는 `memo`, 핸들러는 `useCallback`, 파생값은 `useMemo`로 감쌌습니다.
  모스 키의 홀드 게이지는 60fps로 갱신되므로 `setState` 대신 `useRef` + `requestAnimationFrame`으로 DOM을 직접 조작해
  앱 전체 리렌더링을 피했습니다.
- **StrictMode 안전성** — 입력 상태 머신의 원본은 `ref`, `useState`는 렌더링용 사본입니다.
  타이머 콜백에서 항상 최신 값을 읽을 수 있고, StrictMode의 이중 호출에도 값이 두 번 반영되지 않습니다.
- **접근성** — `aria-pressed`, `aria-live`, 스크린리더 전용 라벨, `:focus-visible` 포커스 링,
  `prefers-reduced-motion` 대응을 포함했습니다.
- **오디오 정책** — 첫 사용자 제스처 시점에 `AudioContext`를 깨우고, 언마운트 시 `close()`로 정리합니다.
