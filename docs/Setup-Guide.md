# 환경 세팅 가이드 (Setup Guide)

이 문서 하나만 따라 하면 clone부터 첫 테스트 실행까지 완료됩니다.
(구 `Mac-Dev-Setup-Guide.md` + README "빠른 시작" 절의 세팅 내용을 통합한 단일 가이드입니다.)

- **소요 시간**: 약 5~10분
- **완료 기준**: 스모크 테스트(`purchase.basic.cy.js`) 1개가 Chrome에서 통과

---

## 1. 사전 요구사항

| 항목 | 버전/조건 | 확인 명령 |
|------|-----------|-----------|
| Node.js | v18 이상 | `node -v` |
| Chrome | 최신 stable 권장 | 브라우저에서 `chrome://version` |
| git | - | `git --version` |
| Docker Desktop | (선택) 컨테이너 실행 시에만 | `docker -v` |

> 테스트 대상인 [saucedemo.com](https://www.saucedemo.com/)은 공개 사이트라 별도 VPN/내부망 접근이 필요 없습니다.

---

## 2. 클론 및 의존성 설치

```bash
git clone https://github.com/sphh12/cypress-saucedemo.git
cd cypress-saucedemo
npm install
```

### ⚠️ 회사망에서 `npm install` 실패 시 (실제 발생 사례)

사내 프록시가 SSL을 가로채는 네트워크에서는 npm 패키지는 설치되지만 **Cypress 바이너리 다운로드만 실패**할 수 있습니다:

```
npm error self-signed certificate in certificate chain
npm error ✖  Downloading Cypress  [FAILED: self-signed certificate in certificate chain]
```

**해결 절차**:

```bash
# 1) 전역 캐시에 사용 가능한 바이너리가 있는지 확인
#    Windows: %LOCALAPPDATA%\Cypress\Cache  /  macOS: ~/Library/Caches/Cypress
npx cypress cache list

# 2) 캐시에 package.json과 같은 버전(15.14.1)이 있으면, 바이너리 다운로드를 건너뛰고 설치
CYPRESS_INSTALL_BINARY=0 npm install

# (Windows PowerShell 은)
$env:CYPRESS_INSTALL_BINARY="0"; npm install
```

> 이 프로젝트는 이 문제 때문에 `package.json`의 cypress 버전을 **15.14.1로 정확 고정**해 두었습니다
> (범위 버전 `^` 사용 시 npm이 캐시에 없는 최신 버전을 설치해 바이너리 불일치가 발생).
> 캐시에 해당 버전이 아예 없다면: 제한 없는 네트워크에서 한 번 설치해 캐시를 만들거나, 사내 CA 인증서를 `NODE_EXTRA_CA_CERTS` 환경변수로 지정하세요.

---

## 3. 환경 설정 파일 생성

민감정보를 담는 실제 설정 파일은 `.gitignore`에 등록되어 커밋되지 않습니다. `.example` 파일을 복사해 만듭니다.

| Example 파일 | 생성 파일 | 필수 여부 | 용도 |
|-------------|----------|:--------:|------|
| `cypress.env.example.json` | `cypress.env.json` | **필수** | 로그인 프로필·테스트데이터 주입 |
| `.env.example` | `.env` | 선택 | SMTP 메일/리포트 파이프라인 |
| `cypress/fixtures/testdata.example.json` | `cypress/fixtures/testdata.json` | 선택 | 스펙용 더미 데이터 (현재 참조 스펙 없음) |

### 3-1. `cypress.env.json` (필수 — 복사만 하면 끝)

```bash
cp cypress.env.example.json cypress.env.json
```

**이 프로젝트는 값을 수정할 필요가 없습니다.** saucedemo는 공개 데모 사이트라 example 파일에 이미 실제 사용 가능한 공개 계정이 채워져 있습니다:

| 프로필 키 | 계정 | 용도 |
|----------|------|------|
| `local` (기본) | `standard_user` | 정상 플로우 |
| `problem` | `problem_user` | UI 버그 시나리오 |
| `performance` | `performance_glitch_user` | 로딩 지연 시나리오 |
| `lockedUser` | `locked_out_user` | 로그인 차단(음성 테스트) |

비밀번호는 전 계정 공통 `secret_sauce`(공개값)이며, 체크아웃용 더미 배송 정보(`testdata`)도 포함되어 있습니다.

### 3-2. `.env` (선택 — 메일 발송 기능을 쓸 때만)

```bash
cp .env.example .env
```

테스트 결과를 HTML 리포트로 만들어 메일로 발송하는 `shell/` 파이프라인 전용입니다. 안 만들어도 테스트 실행에는 영향이 없습니다.

| 환경 변수 | 설명 |
|-----------|------|
| `SMTP_HOST` / `SMTP_PORT` | SMTP 서버 호스트/포트 |
| `SMTP_USER` / `SMTP_PASS` | SMTP 인증 계정/비밀번호(앱 비밀번호 등) |
| `MAIL_FROM` / `MAIL_TO` | 발신/수신 메일 주소 |
| `SPEC_FILE` | 실행할 스펙 경로(기본 `cypress/e2e/**/*.cy.js`) |
| `REPEAT_COUNT` | 반복 실행 횟수(기본 3) |

---

## 4. 설치 검증 (스모크 테스트)

```bash
# 1) Cypress 바이너리 검증
npx cypress verify
# → "Verified Cypress!" 가 나오면 정상

# 2) 스모크 테스트 — 전체 구매 플로우 1개 실행 (약 10초)
npx cypress run --spec "cypress/e2e/saucedemo/purchase.basic.cy.js" --browser chrome
# → "All specs passed!  1 / 1" 이면 세팅 완료 ✅
```

---

## 5. 실행 명령 모음

| npm script | 실행 명령 | 설명 |
|-----------|-----------|------|
| `npm run open` | `cypress open` | Cypress GUI(런처) 실행 |
| `npm test` | `cypress run --browser chrome` | 전체 27개 headless 실행 |
| `npm run test:electron` | `cypress run --browser electron` | 내장 Electron 폴백 실행 |
| `npm run repeat` | `cypress-repeat run -n 3` | 3회 반복(불안정 테스트 점검) |
| `npm run test:history` | `node shell/archive-report.mjs --run` | 전체 실행 + 결과를 히스토리로 보관 |
| `npm run report:summary` | `node shell/generate-summary.mjs` | mochawesome 결과 → 한국어 요약 |
| `npm run report:archive` | `node shell/archive-report.mjs` | 직전 실행 리포트만 히스토리로 보관 |
| `npm run docker:test` | `docker compose up cypress` | 컨테이너에서 실행 |

HTML 리포트는 실행 후 `cypress/reports/html/index.html`에 생성됩니다.

### 실행 이력 보관 (히스토리)

HTML 리포트는 **매 실행마다 덮어쓰기**되어 직전 결과만 남습니다. 과거 이력을 누적하려면:

```bash
npm run test:history      # 실행 후 성공·실패 무관하게 보관 (권장)
npm run report:archive    # 이미 실행한 리포트만 보관
```

`cypress-history/<날짜_시각>/`에 리포트 전체가 복사됩니다(`.gitignore` 처리됨). `test:history`는 폴더명 뒤에 `_pass`/`_fail`을 붙여 실패한
실행을 바로 골라낼 수 있고, `report:archive`는 결과를 알 수 없으므로 시각만 붙습니다. 특정 스펙만 실행하려면 `--` 뒤에 cypress 옵션을 붙입니다:

```bash
npm run test:history -- --spec "cypress/e2e/saucedemo/cart.cy.js"
```

보관 위치는 `HISTORY_DIR`, 보관 개수 제한은 `HISTORY_KEEP`(미지정 시 전부 유지) 환경변수로 조정합니다. 최근 20개만 유지하려면:

```bash
# PowerShell (Windows)
$env:HISTORY_KEEP="20"; npm run test:history

# bash / zsh (macOS·Linux)
HISTORY_KEEP=20 npm run test:history
```

---

## 6. macOS (Apple Silicon) 참고

> Windows에서 작업하다 집 Mac에서 이어서 세팅할 때의 참고 사항입니다. saucedemo는 공개망이라 Mac에서도 모든 작업(GUI/CLI 실행 포함)이 가능합니다.

### Node.js — sudo 권한 없이 설치

```bash
curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-arm64.tar.gz -o /tmp/node.tar.gz
tar xzf /tmp/node.tar.gz -C /tmp/
mkdir -p ~/local && cp -a /tmp/node-v22.14.0-darwin-arm64/* ~/local/
echo 'export PATH="$HOME/local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
node -v   # v22.14.0
```

### gh CLI (GitHub 인증용)

```bash
curl -sL "https://github.com/cli/cli/releases/download/v2.88.1/gh_2.88.1_macOS_arm64.zip" -o /tmp/gh.zip
unzip -o /tmp/gh.zip -d /tmp/gh
export PATH="/tmp/gh/gh_2.88.1_macOS_arm64/bin:$PATH"
gh auth login -h github.com -p https -w
```

### Docker Desktop (선택)

[docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)에서 **Mac (Apple Silicon)** 버전 설치.

### docker-compose 기록 경로

Windows 경로가 환경변수로 처리되어 있어 Mac에서는 별도 설정이 필요 없습니다(기본값 `./cypress-history`). 다른 경로를 쓰려면 `.env`에 `CYPRESS_HISTORY_DIR=<경로>`를 지정합니다.

---

## 7. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `self-signed certificate in certificate chain` | 사내 프록시 SSL 인터셉트 | §2 절차: 캐시 확인 → `CYPRESS_INSTALL_BINARY=0 npm install` |
| `The cypress npm package is installed, but the Cypress binary is missing` | 패키지·바이너리 버전 불일치 | `npx cypress cache list`로 캐시 버전 확인 후 package.json 버전과 일치시키기 |
| `cy.login` 실패 / `loginEnvs` undefined | `cypress.env.json` 미생성 | §3-1: `cp cypress.env.example.json cypress.env.json` |
| `report:summary` 실행 시 JSON 미발견 | 리포터가 HTML 병합 후 `.jsons`를 비움 (알려진 이슈) | HTML 리포트(`cypress/reports/html/index.html`)를 직접 확인 |
| Docker/Linux에서 Chrome 크래시 | 샌드박스/공유메모리 문제 | 이미 `cypress.config.js`에서 `--no-sandbox --disable-dev-shm-usage` 플래그 자동 적용됨 |
