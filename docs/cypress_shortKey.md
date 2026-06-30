# Cypress 명령어 정리 (Cheat Sheet)

> 이 템플릿 기준 자주 쓰는 명령어 모음.
> 별도 표기가 없으면 모든 명령은 **프로젝트 루트**에서 실행한다.
> 로그인/테스트 데이터는 `cypress.env.json`(= `cypress.env.example.json` 복사본)에서 주입한다.

---

## 1. 테스트 실행 (npm 스크립트)

| 명령어 | 설명 |
|---|---|
| `npm run open` | GUI(Test Runner) 모드로 열기 — 테스트 선택·실시간 확인 |
| `npm run test` | 전체 spec **헤드리스** 실행 |
| `npm run test:chrome` | Chrome 브라우저로 헤드리스 실행 |
| `npm run repeat` | spec을 N회 반복 실행 (간헐 실패 검증) |
| `npm run report:summary` | mochawesome JSON → 한국어 요약 텍스트 생성 |
| `npm run docker:test` | Docker 컨테이너에서 테스트 실행 (리포트+메일까지) |
| `npm run docker:dev` | Docker 개발 모드 (`cypress-dev`, profile `dev`) |
| `npm run docker:repeat` | Docker 반복 실행 (`cypress-repeat`, profile `repeat`) |

```bash
# 예시: GUI 모드로 열어서 테스트 골라 실행
npm run open

# 예시: 전체를 Chrome 헤드리스로 실행
npm run test:chrome
```

---

## 2. 반복 실행 (간헐 실패 검증)

간헐적으로 실패하는 테스트를 N회 연속 돌려 안정성을 확인할 때 사용한다.
대상 spec은 환경변수 `SPEC_FILE`, 반복 횟수는 `REPEAT_COUNT`로 지정한다.

```bash
# 기본: SPEC_FILE 전체를 REPEAT_COUNT(기본 3)회 반복
npm run repeat
```

- `REPEAT_COUNT` 생략 시 기본 **3회**
- 앞 회차가 실패해도 멈추지 않고 지정 횟수를 끝까지 실행

```bash
# 예시: 특정 spec을 5회 반복 (POSIX 셸 기준)
SPEC_FILE="cypress/e2e/sample/sample.dom.cy.js" REPEAT_COUNT=5 npm run repeat

# 예시 (PowerShell)
$env:SPEC_FILE="cypress/e2e/sample/sample.dom.cy.js"; $env:REPEAT_COUNT="5"; npm run repeat

# Docker로 반복 실행
npm run docker:repeat
```

---

## 3. Cypress CLI 직접 실행 (스크립트 없이)

| 명령어 | 설명 |
|---|---|
| `npx cypress open` | GUI 모드로 열기 (테스트 선택·실시간 확인) |
| `npx cypress run` | 헤드리스로 전체 실행 |
| `npx cypress run --spec "경로"` | 특정 파일만 실행 |
| `npx cypress run --browser chrome --headless` | 브라우저·헤드리스 지정 |
| `npx cypress version` | 버전 확인 |

```bash
# 예시: 특정 파일을 Chrome 헤드리스로 직접 실행
npx cypress run --spec "cypress/e2e/sample/sample.dom.cy.js" --browser chrome --headless

# 예시: 글로브 패턴으로 여러 파일 실행
npx cypress run --spec "cypress/e2e/**/*.cy.js"
```

---

## 4. 자주 쓰는 cy.* 명령어 (테스트 작성용)

| 명령어 | 용도 | 예시 |
|---|---|---|
| `cy.visit(url)` | 페이지 이동 | `cy.visit('https://example.com')` |
| `cy.get(selector)` | 요소 선택 | `cy.get('[name="username"]')` |
| `cy.contains(text)` | 텍스트로 선택 | `cy.contains('Dashboard')` |
| `.type(text)` | 입력 | `cy.get('#id').type('TEST_USER')` |
| `.click()` | 클릭 | `cy.get('[name="btnLogin"]').click()` |
| `.clear()` | 입력값 비우기 | `cy.get('#search').clear()` |
| `.should(조건)` | 검증(자동 재시도) | `cy.get('#menu').should('be.visible')` |
| `cy.url()` | 현재 URL 검증 | `cy.url().should('include', '/dashboard')` |
| `cy.wait(ms)` | 고정 대기(지양) | `cy.wait(2000)` |
| `cy.log(msg)` | 로그 출력 | `cy.log('## 로그인 ##')` |
| `Cypress.env(key)` | 환경변수 읽기 | `Cypress.env('loginEnvs')` |

### 커스텀 커맨드 (이 템플릿 제공)

| 명령어 | 용도 |
|---|---|
| `cy.login(env)` | `loginEnvs[env]` 설정으로 로그인 (`'local'`, `'iframeLegacy'` 등) |
| `Cypress.getDate()` | 날짜 문자열 헬퍼 |
| `cy.ModuleAdd(...)` | 모듈 추가 헬퍼 |
| `cy.getAll(...)` | 여러 요소 일괄 조회 헬퍼 |

```js
// 예시: 일반 SPA 로그인
cy.login('local');

// 예시: iframe 레거시 화면 로그인
cy.login('iframeLegacy');
```

### 자주 쓰는 `.should()` 조건

```js
.should('be.visible')        // 화면에 보임
.should('exist')             // DOM에 존재 (보이지 않아도 OK)
.should('not.exist')         // DOM에 없음
.should('have.text', 'OK')   // 텍스트 정확히 일치
.should('include.text', 'O') // 텍스트 일부 포함
.should('have.value', '10')  // input 값
.should('have.length', 3)    // 개수
```

### 타임아웃 지정 (느린 요소 대기)

```js
// 기본 타임아웃(4초) 대신 개별 지정
cy.get('#menu', { timeout: 20000 }).should('be.visible');
```

---

## 5. iframe 레거시 화면 다루기

레거시 화면은 메뉴 진입 후 콘텐츠가 `iframe` 안에 로드되는 경우가 있다.
이 템플릿은 POM의 `cypress/pages/base/IframeBasePage.js`에서 iframe 진입을 공통 처리한다.

```js
// iframe 내부 요소 검증 (재시도 방식)
cy.get('iframe#mainFrame', { timeout: 10000 }).should($iframe => {
    const body = $iframe[0].contentDocument.body;
    expect(body.innerText).to.include('Generated On');
});
```

> iframe 레거시 예시 URL은 `https://legacy.example.com` 기준으로 작성한다.

---

## 6. 디버깅 팁

| 항목 | 방법 |
|---|---|
| 특정 명령 일시정지 | `cy.pause()` / `.debug()` |
| 느린 요소 | `{ timeout: ms }` 옵션 추가 |
| 실패 스크린샷 | `cypress/screenshots/` 에 자동 저장 |
| 실패 비디오 | `cypress/videos/` (성공 시 자동 삭제 설정 가능) |
| 컨테이너 로그 | `docker logs <컨테이너명> --tail 200` |

---

_최종 수정: 2026-06-30_
