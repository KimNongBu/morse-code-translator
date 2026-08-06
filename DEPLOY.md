# 배포 가이드 — Cloudflare Pages

이 앱은 서버·DB·API 키가 없는 **순수 정적 사이트**입니다.
`yarn build` 결과물(`dist/`)만 올리면 되므로 무료 티어로 충분합니다.

---

## 1. GitHub에 새 저장소 만들기

> ⚠️ **홈 디렉터리 저장소(`C:\Users\soryo`)에는 절대 올리지 마세요.**
> 그 저장소의 루트는 홈 폴더 전체라서 `git add -A` 한 번이면
> `.ssh/`, `.claude.json`, 브라우저 프로필까지 스테이징됩니다.
> 이 프로젝트 폴더에는 **별도의 독립 저장소**가 이미 초기화되어 있습니다.

1. https://github.com/new 접속
2. Repository name: `morse-code-translator`
3. Public / Private 아무거나 (Cloudflare Pages는 둘 다 무료로 연결됩니다)
4. **README, .gitignore, license는 추가하지 마세요** (이미 있으므로 충돌합니다)
5. `Create repository`

## 2. 푸시

저장소를 만들면 나오는 URL로 아래를 실행합니다.
(`<GITHUB_계정>` 부분만 본인 것으로 바꾸세요)

```powershell
cd "c:\Users\soryo\Desktop\2026 UOU\AI에이전트\morse-code-translator"
git remote add origin https://github.com/<GITHUB_계정>/morse-code-translator.git
git branch -M main
git push -u origin main
```

## 3. Cloudflare Pages 연결

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** 탭
2. **Connect to Git** → GitHub 계정 연결 → `morse-code-translator` 저장소 선택
3. 빌드 설정을 아래와 같이 입력합니다.

| 항목 | 값 |
| --- | --- |
| Framework preset | `Vite` |
| Build command | `yarn build` |
| Build output directory | `dist` |
| Root directory | (비워둠) |

4. **Save and Deploy**

1~2분 뒤 `https://morse-code-translator-xxx.pages.dev` 주소가 나옵니다.
이후 `git push` 할 때마다 자동으로 재배포됩니다.

---

## 빌드가 실패하면

### `tsc: not found` / `vite: not found`

호스팅 빌드 환경이 `NODE_ENV=production`으로 설정되어 devDependencies를 건너뛴 경우입니다.
(`tsc`와 `vite`는 devDependencies에 있습니다.)

Cloudflare Pages 대시보드 → **Settings** → **Variables and Secrets** →
빌드 환경변수에 다음을 추가하고 재배포하세요.

```
NODE_ENV = development
```

### Node 버전 오류

Vite 8은 Node `^20.19.0 || >=22.12.0`을 요구합니다.
저장소에 `.nvmrc`(`22.12.0`)를 포함해 두어 Cloudflare가 자동으로 인식하지만,
그래도 실패하면 환경변수에 다음을 추가하세요.

```
NODE_VERSION = 22.12.0
```

---

## 배포 후 확인할 것

이 앱은 두 가지 브라우저 API를 쓰는데, 둘 다 **HTTPS에서만** 정상 동작합니다.
Cloudflare Pages는 무료 HTTPS를 제공하므로 문제없지만, 확인은 해두세요.

- **Web Audio** — 모스음이 나는지 (첫 클릭/키 입력 이후에 소리가 납니다. 브라우저 자동재생 정책)
- **클립보드 복사** — `navigator.clipboard`가 HTTPS를 요구합니다.
  (실패 시 `execCommand` 폴백이 동작하도록 이미 구현되어 있습니다)

---

## 다른 무료 선택지

| 서비스 | 특징 |
| --- | --- |
| **Vercel** | 설정 동일 (`yarn build` / `dist`). 취미 프로젝트 무료 |
| **Netlify** | 설정 동일. `dist` 폴더 드래그 배포(Netlify Drop)도 가능 |
| **GitHub Pages** | 무료지만 하위 경로(`user.github.io/repo/`)로 서비스되므로 `vite.config.ts`에 `base: '/morse-code-translator/'` 설정이 추가로 필요합니다 |
