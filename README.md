# Cypress E2E 테스트 자동화 템플릿

## 1. 소개

이 저장소는 **Cypress 기반 웹 E2E 테스트 자동화를 빠르게 시작하기 위한 템플릿**입니다.
도메인에 종속되지 않도록 설계되어, 로그인 정보·대상 URL·테스트 데이터를 환경 설정 파일(`cypress.env.json`)에서 주입하면 일반 SPA(React/Vue 등)와 레거시 iframe 기반 화면을 모두 동일한 구조로 테스트할 수 있습니다. Page Object Model(POM) 표준 예시, 자주 쓰는 커스텀 커맨드, 샘플 스펙, Docker 실행 구성, 선택적 메일/리포트 파이프라인을 함께 제공하여 "복사해서 바로 따라 쓰는" 출발점을 목표로 합니다.

---

## 2. Tech Stack

| 구분 | 기술 |
|------|------|
| 테스트 프레임워크 | Cypress 15.x |
| 언어 | JavaScript |
| POM | AbstractBasePage / DomBasePage / IframeBasePage |
| 반복 실행 | cypress-repeat |
| 리포트 | mochawesome / mochawesome-report-generator |
| 컨테이너 | Docker / docker compose |
| 메일·리포트(선택) | shell 스크립트 + SMTP |

> 주요 플러그인: `cypress-iframe`, `cypress-real-events`, `cypress-clipboard`, `cypress-xpath`, `@cypress/grep`

---

## 3. 빠른 시작

### 사전 요구사항
- Node.js v18 이상
- (선택) Docker Desktop

### 설치
```bash
npm install
```

### 환경 설정 파일 생성

민감한 정보를 담는 설정 파일은 `.gitignore`에 등록되어 있습니다. clone 후 아래 `.example` 파일들을 복사하여 실제 설정 파일을 만드세요.

```bash
# 1) 환경 변수 (메일/리포트 파이프라인용 — 선택)
cp .env.example .env

# 2) 로그인/테스트데이터 주입 파일 (필수)
cp cypress.env.example.json cypress.env.json

# 3) 추가 픽스처 (선택)
cp cypress/fixtures/testdata.example.json cypress/fixtures/testdata.json
```

| Example 파일 | 생성 파일 | 필수 여부 | 용도 |
|-------------|----------|:--------:|------|
| `cypress.env.example.json` | `cypress.env.json` | **필수** | `loginEnvs`(로그인 환경)·`testdata` 주입 |
| `.env.example` | `.env` | 선택 | SMTP/메일·리포트 파이프라인 설정 |
| `cypress/fixtures/testdata.example.json` | `cypress/fixtures/testdata.json` | 선택 | 스펙용 더미 테스트 데이터 |

#### `cypress.env.json` 의 `loginEnvs` 채우기

`loginEnv` 값으로 사용할 환경 키를 고르고, `loginEnvs` 아래에 해당 환경의 로그인 정보를 채웁니다.
기본 예시로 일반 SPA용 `local`, iframe 레거시용 `iframeLegacy` 두 가지가 들어 있습니다.

```jsonc
{
  "loginEnv": "local",
  "loginEnvs": {
    "local": {
      "url": "https://example.com/login",
      "username": "YOUR_USERNAME",
      "password": "YOUR_PASSWORD",
      "compCode": "",
      "selectors": {
        "username": "#username",
        "password": "#password",
        "compCode": "",
        "submit": "button[type=\"submit\"]"
      },
      "successUrl": "/dashboard",
      "successSelector": "#menu",
      "viewport": { "width": 1920, "height": 1080 }
    }
  }
}
```

**`loginEnvs` 스키마**

| 키 | 설명 |
|----|------|
| `url` | 로그인 페이지 URL |
| `username` / `password` | 로그인 계정/비밀번호 |
| `compCode` (선택) | 회사코드 등 추가 입력값 (없으면 빈 문자열) |
| `selectors.username` / `.password` / `.submit` | 입력 필드/제출 버튼 셀렉터 |
| `selectors.compCode` (선택) | 추가 입력 필드 셀렉터 |
| `successUrl` | 로그인 성공 후 도달하는 URL 일부 |
| `successSelector` | 로그인 성공 후 보여야 하는 요소 셀렉터 |
| `viewport` | `{ width, height }` 뷰포트 크기 |

> 개인정보(주민번호·실명·계좌번호 등) 실제 값을 절대 넣지 마세요. `testdata`에는 `YOUR_TEST_ID_NUMBER`, `TEST_USER`, `YOUR_ACCOUNT_NUMBER` 같은 더미 값만 사용합니다.

---

## 4. 실행

```bash
npm run open
```

| npm script | 실행 명령 | 설명 |
|-----------|-----------|------|
| `open` | `cypress open` | Cypress GUI(런처) 실행 |
| `test` | `cypress run` | headless 전체 실행 |
| `test:chrome` | `cypress run --browser chrome` | Chrome 으로 headless 실행 |
| `repeat` | `cypress-repeat run -n 3` | 동일 스펙 3회 반복 실행(불안정 테스트 점검) |
| `report:summary` | `node shell/generate-summary.mjs` | mochawesome 결과 → 한국어 요약 생성 |
| `docker:test` | `docker compose up cypress` | 컨테이너에서 테스트 실행 |
| `docker:dev` | `docker compose --profile dev up cypress-dev` | 개발용(dev 프로파일) 컨테이너 실행 |
| `docker:repeat` | `docker compose --profile repeat run --rm cypress-repeat` | 컨테이너에서 반복 실행(repeat 프로파일) |

> 특정 스펙만 실행: `npx cypress run --spec "cypress/e2e/sample/sample.dom.cy.js"`

---

## 5. 프로젝트 구조

```
cypress_template/
├── cypress/
│   ├── e2e/
│   │   ├── sample/
│   │   │   ├── sample.dom.cy.js       # 일반 SPA 샘플 스펙
│   │   │   └── sample.iframe.cy.js    # iframe 레거시 샘플 스펙
│   │   ├── example/                   # Cypress 공식 학습 예제
│   │   └── module/                    # 로그인/iframe 등 공용 모듈
│   ├── pages/
│   │   ├── base/
│   │   │   ├── AbstractBasePage.js    # 공통 추상 베이스
│   │   │   ├── DomBasePage.js         # 일반 SPA용 베이스
│   │   │   └── IframeBasePage.js      # iframe 레거시용 베이스
│   │   ├── components/
│   │   │   └── GridComponent.js       # 그리드 공용 컴포넌트
│   │   ├── dom/ExampleSearchPage.js   # 일반 SPA 페이지 예시
│   │   └── iframe/ExampleSearchPage.js# iframe 페이지 예시
│   ├── fixtures/                      # 테스트 데이터(.example 포함)
│   └── support/
│       ├── commands.js                # 커스텀 커맨드
│       └── e2e.js                     # 전역 설정
├── shell/                             # 메일/리포트 파이프라인(선택)
├── docs/                              # 가이드 문서 6종
├── docker-compose.yml                 # cypress / cypress-dev / cypress-repeat
├── Dockerfile
├── cypress.config.js
├── cypress.env.example.json           # → cypress.env.json 으로 복사
└── .env.example                       # → .env 으로 복사(선택)
```

---

## 6. POM(Page Object Model) 사용법

화면 구조에 따라 **두 가지 계열**의 베이스 페이지를 제공합니다. 공통 로직은 `AbstractBasePage`에 모으고, 화면 유형별 차이는 하위 베이스에서 처리합니다.

```
AbstractBasePage (공통 추상)
├── DomBasePage     → 일반 SPA(React/Vue 등, iframe 없음)
└── IframeBasePage  → 레거시 iframe 내부 DOM 접근
```

| 베이스 | 사용 상황 | 예시 페이지 | 예시 스펙 |
|--------|-----------|-------------|-----------|
| `DomBasePage` | iframe 없는 일반 SPA. `cy.get` 으로 바로 접근 | `pages/dom/ExampleSearchPage.js` | `e2e/sample/sample.dom.cy.js` |
| `IframeBasePage` | iframe 안에 본문이 들어있는 레거시 화면. iframe 진입 후 내부 DOM 접근 | `pages/iframe/ExampleSearchPage.js` | `e2e/sample/sample.iframe.cy.js` |

### iframe vs 일반 SPA 선택 안내
- 대상 화면의 본문 요소가 `<iframe>` 안에 들어 있는지 확인합니다(개발자도구에서 요소가 iframe 컨텍스트에 속하는지 확인).
- iframe이 **없으면** `DomBasePage` 계열로, **있으면** `IframeBasePage` 계열로 페이지 객체를 작성합니다.
- 공통 그리드/표 조작은 `components/GridComponent.js`를 재사용합니다.

새 화면을 추가할 때는 위 예시(`ExampleSearchPage`)를 복사해 셀렉터와 동작만 교체하면 됩니다.

---

## 7. 커스텀 커맨드

`cypress/support/commands.js`에 공용 커맨드가 정의되어 있습니다.

| 커맨드 | 설명 |
|--------|------|
| `cy.login(env)` | `cypress.env.json`의 `loginEnvs[env]` 정보로 로그인 수행 |
| `Cypress.getDate()` | 날짜 문자열 생성 유틸 |
| `cy.ModuleAdd(...)` | 모듈 추가/조작 헬퍼 |
| `cy.getAll(...)` | 여러 요소를 한 번에 조회하는 헬퍼 |

### `cy.login(env)` 설정법
1. `cypress.env.json`의 `loginEnvs` 아래에 환경 키(`local`, `iframeLegacy` 등)를 정의합니다(3절 스키마 참고).
2. 스펙에서 환경 키를 인자로 호출합니다.

```javascript
// 일반 SPA 로그인
cy.login('local');

// iframe 레거시 로그인
cy.login('iframeLegacy');
```

> 기본 사용 환경은 `cypress.env.json`의 `loginEnv` 값으로도 지정할 수 있습니다.

---

## 8. 메일/리포트 파이프라인 (선택)

테스트 결과를 HTML 리포트로 만들고 메일로 발송하려면 `shell/` 스크립트를 사용합니다. **선택 사항**이며, 사용하지 않아도 테스트 실행에는 영향이 없습니다.

| 스크립트 | 역할 |
|----------|------|
| `shell/run-test.sh` | `SPEC_FILE` 기준 테스트 실행(Linux/Docker면 Xvfb 시작) 후 리포트·메일 연동 |
| `shell/run-repeat.sh` | `REPEAT_COUNT`회 반복 실행 후 리포트·메일 연동 |
| `shell/visualization.js` | Cypress 실행 결과를 이메일용 HTML 표로 변환 |
| `shell/curl.sh` | SMTP로 결과 메일 발송 |
| `shell/generate-summary.mjs` | mochawesome JSON → 한국어 요약 텍스트 생성 |

환경 변수는 `.env`(= `.env.example` 복사본)에서 주입합니다.

| 환경 변수 | 설명 |
|-----------|------|
| `SMTP_HOST` / `SMTP_PORT` | SMTP 서버 호스트/포트 |
| `SMTP_USER` / `SMTP_PASS` | SMTP 인증 계정/비밀번호(앱 비밀번호 등) |
| `MAIL_FROM` / `MAIL_TO` | 발신/수신 메일 주소 |
| `SPEC_FILE` | 실행할 스펙 경로(기본 `cypress/e2e/**/*.cy.js`) |
| `REPEAT_COUNT` | 반복 실행 횟수(기본 3) |

---

## 9. docs 가이드

`docs/` 디렉터리에 활용 가이드 7종이 포함되어 있습니다.

| 문서 | 내용 |
|------|------|
| [Cypress-Kitchen-Sink-Examples-Guide.md](docs/Cypress-Kitchen-Sink-Examples-Guide.md) | example.cypress.io 전 명령 카테고리 한국어 레퍼런스 + 실전 적용 가이드 |
| [Cypress-POM-Improvement-Guide.md](docs/Cypress-POM-Improvement-Guide.md) | 대기 전략과 POM 작성 규칙 |
| [Cypress-Troubleshooting-Guide.md](docs/Cypress-Troubleshooting-Guide.md) | iframe·셀렉터·타이밍 문제 해결 |
| [Cypress-Browser-Alert-Handler.md](docs/Cypress-Browser-Alert-Handler.md) | alert/confirm 등 브라우저 팝업 처리 |
| [Shell-Scripts-Guide.md](docs/Shell-Scripts-Guide.md) | shell 스크립트 역할·호출 관계 |
| [cypress_shortKey.md](docs/cypress_shortKey.md) | 자주 쓰는 명령 치트시트 |
| [Mac-Dev-Setup-Guide.md](docs/Mac-Dev-Setup-Guide.md) | macOS 개발환경 셋업 |
