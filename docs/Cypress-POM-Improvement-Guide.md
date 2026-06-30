# Cypress 가이드 — 명시적 대기(Explicit Wait) & POM(Page Object Model)

> **목적**: Cypress E2E 자동화에서 ① 고정 대기(`cy.wait(숫자)`) 대신 **명시적 대기**를 적용하고, ② 유지보수 가능한 **POM 구조**를 세우기 위한 규칙 문서.
> 이 문서의 규칙(**W1~W8** 대기 규칙, **P1~P10** POM 규칙)이 코드 작성·리뷰의 단일 기준이다.
> 본 템플릿은 두 가지 화면 접근 방식을 모두 지원한다 — **일반 SPA(DOM 직접 접근)** 와 **레거시 iframe(`iframe#mainFrame` 내부 접근)**. 예시는 두 경우를 함께 제시한다.

---

## 0. 설계 결정 요약

| 항목 | 결정 |
|------|------|
| POM 스타일 | ES6 클래스 + `export default new Page()` **싱글톤**. 테스트에서 `new` 금지 |
| 베이스 구조 | `AbstractBasePage`(공통 규칙) → `IframeBasePage` / `DomBasePage`(화면 접근 방식별 구현). **Template Method 패턴** |
| 컴포넌트 | 공용 UI 조각(그리드/검색폼 등)은 `pages/components/` 에 분리해 **합성(composition)** 으로 사용 |
| 대기 전략 | 고정 `cy.wait(숫자)` 신규 작성 금지 → **관찰 가능한 조건 대기**로 작성. 불가피한 경우만 의미 있는 헬퍼로 격리 |
| 네트워크 intercept | 선택 사항(고급). 기본 전략은 결과 출현/인디케이터 소멸 등 **DOM 관찰 조건** |

---

## 1. 명시적 대기 (Explicit Wait)

### 1.1 개념 매핑: Selenium ↔ Cypress

Cypress에는 Selenium의 `WebDriverWait` + `ExpectedConditions` 객체가 없다. **쿼리 + 어서션 체인 자체가 명시적 대기**다.

| Selenium | Cypress 대응 |
|----------|--------------|
| `WebDriverWait(driver, 60)` | `{ timeout: 60000 }` (명령 단위) |
| `ExpectedConditions.visibilityOf(...)` | `.should('be.visible')` |
| 임의 조건 `until(lambda)` | `.should(콜백)` — 콜백 안 expect 전부 통과까지 재시도 |
| 폴링(0.5s 간격) | 자동 재시도 (내장) |
| `time.sleep(n)` | `cy.wait(ms)` — **양쪽 모두 안티패턴** |

### 1.2 동작 원리 3가지 (모든 W 규칙의 근거)

1. **쿼리만 재시도된다**: `cy.get` / `.find` / `.contains` / `.its` / `.invoke` 는 쿼리(재시도됨). `.click` / `.type` 등 액션은 1회 실행. `.then()` 은 **재시도되지 않는다**.
2. **체인은 맨 위부터 재실행** (Cypress v12+): 어서션 실패 시 연결된 쿼리 체인 전체를 처음부터 다시 실행 → 매 재시도마다 iframe·body를 **새로** 읽는다. (iframe "신선한 body" 처리의 공식 근거)
3. **`{timeout}` 전파 규칙**: 쿼리에 준 timeout은 **그 쿼리에 붙은 어서션까지만** 전파된다. **다음 쿼리(`.its()` 등)로는 전파되지 않는다** — 각 쿼리는 자체 timeout(기본 `defaultCommandTimeout`)으로 동작.

### 1.3 규칙 W1~W8

#### W1. 고정 `cy.wait(숫자)` 신규 작성 금지
- 공식 안티패턴("Unnecessary Waiting"). 모든 대기는 **관찰 가능한 조건**에 건다.
- **유일한 예외**: 관찰 가능한 조건이 존재하지 않음이 검증된 경우(예: 그리드 위젯의 이벤트 바인딩처럼 DOM으로 관찰 불가능한 비동기)에 한해, **의미 있는 이름의 헬퍼로 격리**하고 사유 주석을 단다. spec/POM에 날것의 `cy.wait(2000)`이 보이면 위반.

```js
// Before — 고정 대기 (안티패턴)
cy.wait(2000); // 그리드 렌더링 완료 대기

// After 1순위 — 관찰 가능한 조건으로 교체 (W6 형태 B 게이트)
grid.waitForRows();            // 내부: 신선한 body 에서 결과 행 출현 재시도

// After 2순위 — 조건화 불가가 검증된 경우만: 헬퍼 격리 + 사유 주석
grid.waitForEventBinding();    // 내부: cy.wait(GRID_SETTLE_MS) — 그리드 이벤트 바인딩은 DOM 관찰 불가
```

#### W2. 조건 대기는 `should()` 로 — 콜백 작성 3원칙
`.should(콜백)`이 Cypress의 만능 명시적 대기다 (콜백 안 expect가 전부 통과할 때까지 체인 재실행).
1. 콜백은 **멱등**해야 한다 (몇 번 실행돼도 같은 결과 — 부수효과 금지)
2. 콜백 안에서 **`cy.*` 명령 금지** (expect/assert만)
3. 반환값은 무시된다 — 원래 subject가 다음으로 전달됨

#### W3. `.then()`은 대기가 아니다
`.then()` 콜백은 1회만 실행된다. **"기다렸다 검증"은 `.should(콜백)`, "확정된 값으로 작업"은 `.then()`**. 점진 렌더링되는 표의 행 수를 `.then()`으로 세면 부분 카운트가 발생한다.

#### W4. `{timeout}`은 어서션을 달고 있는 **마지막 쿼리에** 준다
`.its()` 등 후속 쿼리로 timeout이 전파되지 않으므로, 긴 대기는 해당 쿼리 자체에 옵션을 줘야 한다.

```js
// 나쁜 예: 10초는 cy.get 에만 적용되고 .its() 는 기본 5초로 동작 (timeout 미전파 결함)
cy.get('iframe#mainFrame', { timeout: 10000 })
    .its('0.contentDocument.body').should('not.be.empty').then(cy.wrap);

// 좋은 예: .its() 에도 timeout 명시 (본 템플릿 module/iframe.js 의 getMainFrame 형태)
export const getMainFrame = (timeout = 10000) => {
    return cy.get('iframe#mainFrame', { timeout })
        .its('0.contentDocument.body', { timeout })
        .should('not.be.empty').then(cy.wrap);
};
```
- 또는 **단일 쿼리 + `should(콜백)`** 형태(`cy.get('iframe', {timeout}).should(cb)`)를 쓰면 timeout 하나가 전체 대기를 지배한다 (쿼리→어서션 전파는 공식 보장).

#### W5. timeout 표준 정책
| 구간 | 표준값 | 근거 |
|------|--------|------|
| 일반 요소 출현/클릭 대상 | 기본값(5s) — 명시 생략 | `defaultCommandTimeout` |
| 페이지/메뉴 전환 완료 (`validate`) | 20s | 화면 전환은 기본보다 길다 |
| 검색/필터 결과 로드 | **60s** | 콜드 히트(첫 조회·캐시 미스) 대응 |
| 리포트/무거운 문서 로드 (iframe.src 직후) | **60s** | 콜드 실측 여유 |
| 로그인/대시보드 진입 | 20s | 초기 진입 안정성 |

- **이 표를 신규/수정 코드의 기준값으로 사용한다.** 숫자는 프로젝트 특성(서버 응답, 네트워크)에 맞게 조정 가능하되, 화면 단위가 아니라 **구간 단위**로 일관되게 적용한다.

#### W6. iframe 대기 표준 — 매 호출 재취득 + 새 상태 검증
> iframe 환경에만 해당. 일반 SPA는 `cy.get('body')` 가 항상 신선하므로 형태 B의 "신선한 문서" 고민이 없다(W7만 따른다).

1. **body를 변수에 저장 금지.** postback마다 iframe 내부 DOM이 통째로 교체되므로 저장 참조는 무조건 stale.
2. **용도별 표준 2형태**:
```js
// 형태 A — 동작용 body 취득 (find/click/type): IframeBasePage.body() → getMainFrame
this.body().find(this.selectors.searchBtn).click();

// 형태 B — 대기/검증 게이트: 단일 쿼리 + should(콜백) (IframeBasePage.waitUntil)
// 매 재시도마다 iframe 요소부터 다시 조회 + 콜백 안에서 contentDocument 를 새로 읽음
// → postback 을 넘어 "신선한 문서"가 보장됨
cy.get('iframe#mainFrame', { timeout: 60000 }).should(($iframe) => {
    const body = $iframe[0].contentDocument && $iframe[0].contentDocument.body;
    expect(body, 'iframe body').to.not.be.empty;
    expect(Cypress.$(body).find('table tr').length, '결과 행').to.be.greaterThan(1);
});
```
3. **금지**: 형태 A 뒤에 `.should(콜백)`을 붙여 대기 게이트로 쓰는 것. `getMainFrame()`은 `.then(cy.wrap)`으로 끝나 **재시도 체인이 거기서 끊기므로**, 콜백이 옛 body를 들고 재시도한다(stale body + timeout 미전파 복합 결함). 대기는 반드시 **형태 B**(`waitUntil`)로.
4. `'not.be.empty'`만으로는 부족하다 — postback **이후에만 존재하는 내용**으로 단언해야 옛 문서 오탐 통과를 막는다 (형태 B 예시의 두 번째 expect).

#### W7. 대기는 시간이 아니라 **관찰 가능한 조건**에 건다
조건 선택 우선순위:
1. **결과 자체의 출현**: 결과 행/특정 텍스트/입력값 반영 (`table tr` 개수 > 1, 텍스트 포함)
2. **로딩 인디케이터 소멸**: `.loading, .spinner` `not.exist`
3. **에러 페이지 감지 + 재시도**: 서버 에러 간헐 구간은 감지 후 재진입
4. (선택) 네트워크 intercept — W8

#### W8. `cy.intercept` 기반 대기 — 선택 사항(고급)
네트워크 요청을 intercept로 잡는 방식(`cy.intercept(...).as('req')` + `cy.wait('@req')`)은 가장 정밀하다. 단, 레거시 iframe 문서 요청(예: 서버 렌더링 postback) 매칭은 공식 보장이 약하고 회귀 위험이 있어 **기본 전략은 W7의 DOM 관찰 조건**으로 한다. API 응답을 명확히 기다려야 하는 일반 SPA에서는 적극 활용해도 좋다.

```js
// 일반 SPA 예시 — 검색 API 응답을 명시적으로 대기
cy.intercept('GET', '**/api/search*').as('search');
page.search('keyword');
cy.wait('@search').its('response.statusCode').should('eq', 200);
```

---

## 2. POM 구조

### 2.1 왜 POM인가
- Cypress 공식 문서는 POM을 금지하지 않는다. 금지하는 것은 "페이지 객체로 **상태 공유**"와 "매 테스트 느린 UI 셋업". 앱 내부(model/API)를 제어할 수 없는 **레거시 환경에서는 무상태(stateless) POM이 정석**이다.
- 최대 효과 지점: spec에 산재하기 쉬운 `contentDocument` 접근·중복 셀렉터를 **페이지 단위로 중앙화** → 앱 UI가 바뀌어도 **수정 지점이 1곳**이 된다.

### 2.2 디렉터리 구조

```
cypress/
├── e2e/
│   ├── module/
│   │   ├── iframe.js             # iframe 공용 헬퍼 (getMainFrame · validatePage · enterMenu 등)
│   │   └── login.module.js       # 로그인 모듈
│   ├── sample/                   # 샘플 스펙 (sample.dom.cy.js · sample.iframe.cy.js)
│   └── example/                  # 학습용 예제 (Cypress 공식 예제 기반)
├── pages/                        # POM — specPattern 밖이라 러너가 spec 으로 오인하지 않음
│   ├── base/
│   │   ├── AbstractBasePage.js   # 공통 규칙(추상): body / waitUntil / validate / diag
│   │   ├── IframeBasePage.js     # iframe#mainFrame 내부 접근 구현
│   │   └── DomBasePage.js        # 일반 DOM(cy.get('body')) 접근 구현
│   ├── components/
│   │   └── GridComponent.js      # 결과 그리드: 행 대기/카운트 (BasePage 상속 금지)
│   ├── iframe/
│   │   └── ExampleSearchPage.js  # iframe 버전 예시 POM
│   └── dom/
│       └── ExampleSearchPage.js  # 일반 SPA 버전 예시 POM
├── fixtures/
└── support/                      # commands.js (cy.login, Cypress.getDate, cy.ModuleAdd, cy.getAll)
```
- import는 상대 경로(예: `import IframeBasePage from '../base/IframeBasePage'`). 깊이가 불편하면 jsconfig path alias는 선택 사항.

### 2.3 규칙 P1~P10

| # | 규칙 | 핵심 |
|---|------|------|
| **P1** | 클래스 + 싱글톤 | `class XxxPage extends BasePage` + `export default new XxxPage()`. 테스트에서 `new` 금지 |
| **P2** | **무상태** | 인스턴스 필드는 **셀렉터 상수/함수와 무상태 컴포넌트 인스턴스만**. Cypress 체인·요소·body 저장 금지 (비동기 큐 — 저장 즉시 stale) |
| **P3** | 상속 1단만 | `AbstractBasePage` → `IframeBasePage`/`DomBasePage` → 페이지. 베이스 비대화 금지 — 범용 헬퍼는 custom command로 |
| **P4** | 컴포넌트 합성 | 그리드/검색폼 등 공용 UI는 `components/`로 분리해 페이지가 가져다 씀. URL이 없으므로 BasePage 상속 금지, 필요한 것은 **생성자/파라미터로 주입** |
| **P5** | 셀렉터 중앙화 | 클래스 상단 `selectors` 맵(문자열 또는 함수). 자동 생성 ID는 **끝부분 매칭** `[id$='_btnSearch']`, 텍스트 기반은 `cy.contains`. **spec에서 raw 셀렉터 사용 금지** |
| **P6** | 메서드 = 사용자 의도 단위 | `search(keyword)`, `openTab(name)` — 단일 cy 명령의 1:1 래퍼(`clickButton(sel)`) 금지 (공식 안티패턴) |
| **P7** | 반환 규칙 | 액션 메서드 → `return this`(체이닝). 조회/검증 대상 반환 → cy 체인 반환. **다음 페이지 객체 반환 금지** (페이지 간 결합) |
| **P8** | 어서션 위치 | 액션 메서드에 검증 섞지 않기. 단, `verifyXxx()` 전용 검증 메서드는 허용 (브리틀한 셀렉터 중앙화 이점) |
| **P9** | 데이터 주입 | 테스트 데이터는 **메서드 파라미터**로. 페이지 객체에 계정/데이터 하드코딩 금지. 로그인/테스트 데이터 원천은 `cypress.env.json`(gitignore) 의 `loginEnvs` 등 |
| **P10** | 로그인은 페이지 객체 밖 | `cy.login(env)` 커스텀 커맨드를 `beforeEach` 에서 호출하는 방식 유지. `cy.session()` 도입은 동작 변경이므로 별도 검토 |

### 2.4 골격 예시

#### 공통 추상 베이스 (`pages/base/AbstractBasePage.js`)
```js
// 공통 규칙만 정의(추상). "화면에 어떻게 닿는가"는 자식이 구현 (Template Method)
export default class AbstractBasePage {
    body(timeout) { throw new Error('자식 클래스에서 구현'); }           // 동작용 body (W6 형태 A)
    waitUntil(assertCb, timeout = 60000) { throw new Error('자식 클래스에서 구현'); } // 대기 게이트 (W6 형태 B)
    validate() { return this; }                                          // 페이지 유효성(기본 no-op)
    diag(label) { /* --env DIAG=true 일 때만 로그 */ return this; }
}
```

#### iframe 베이스 (`pages/base/IframeBasePage.js`)
```js
import AbstractBasePage from './AbstractBasePage';
import { getMainFrame, validatePage } from '../../e2e/module/iframe';

export default class IframeBasePage extends AbstractBasePage {
    body(timeout) { return getMainFrame(timeout); }                       // 매 호출 재취득

    waitUntil(assertCb, timeout = 60000) {                                // 신선한 문서 게이트
        return cy.get('iframe#mainFrame', { timeout }).should(($iframe) => {
            const body = $iframe[0].contentDocument && $iframe[0].contentDocument.body;
            expect(body, 'iframe body').to.not.be.empty;
            assertCb(body);
        });
    }
    validate() { validatePage(); return this; }
}
```

#### 일반 SPA 베이스 (`pages/base/DomBasePage.js`)
```js
import AbstractBasePage from './AbstractBasePage';

export default class DomBasePage extends AbstractBasePage {
    body(timeout) { return cy.get('body', { timeout }); }                 // 일반 DOM 은 항상 신선

    waitUntil(assertCb, timeout = 60000) {
        return cy.get('body', { timeout }).should(($body) => assertCb($body[0]));
    }
}
```

#### 컴포넌트 (`pages/components/GridComponent.js`) — 합성(P4)
```js
// BasePage 를 상속하지 않는다. 페이지의 waitUntil 게이트를 주입받아 무상태(P2)
export default class GridComponent {
    constructor(waitUntil) { this.waitUntil = waitUntil; }

    waitForRows(rowSelector = 'table tr', timeout = 60000) {              // W1 교체 대상의 표준 행선지 (W6 형태 B)
        return this.waitUntil((body) => {
            expect(Cypress.$(body).find(rowSelector).length, '결과 행 로드').to.be.greaterThan(1);
        }, timeout);
    }
}
```

#### 페이지 — iframe 버전 (`pages/iframe/ExampleSearchPage.js`)
```js
import IframeBasePage from '../base/IframeBasePage';
import GridComponent from '../components/GridComponent';
import { enterMenu } from '../../e2e/module/iframe';

class ExampleSearchPage extends IframeBasePage {
    selectors = {
        keyword: '#searchInput',
        searchBtn: '#searchBtn',
        resultTable: 'table.result-grid',
    };
    grid = new GridComponent((cb, t) => this.waitUntil(cb, t));           // 게이트 주입 (P4)

    open()        { enterMenu('Example', 'Search'); return this; }        // 메뉴 진입 (P6)
    verifyTitle() { this.waitUntil((b) => expect(b.textContent, '타이틀').to.include('Search'), 20000); return this; }
    search(keyword) {                                                     // 입력값 반영까지 명시적 대기 (W1)
        this.body().find(this.selectors.keyword).clear().type(keyword).should('have.value', keyword);
        this.body().find(this.selectors.searchBtn).click();
        return this;
    }
    verifyResult() { return this.grid.waitForRows(`${this.selectors.resultTable} tr`, 60000); } // P8
}
export default new ExampleSearchPage();                                   // P1 무상태 싱글톤
```

#### 페이지 — 일반 SPA 버전 (`pages/dom/ExampleSearchPage.js`)
> iframe 버전과 비교하면 `search` / `verifyResult` 로직은 동일하고, **"화면에 닿는 법"(부모 클래스)과 진입 방식(`open`)만** 다르다. 이것이 `AbstractBasePage` 추상화의 효과다.
```js
import DomBasePage from '../base/DomBasePage';
import GridComponent from '../components/GridComponent';

class ExampleSearchPage extends DomBasePage {
    selectors = { keyword: '#searchInput', searchBtn: '#searchBtn', resultTable: 'table.result-grid' };
    grid = new GridComponent((cb, t) => this.waitUntil(cb, t));

    open(url = '/search') { this.goTo(url, 'Search'); return this; }      // URL 이동으로 진입
    // verifyTitle / search / verifyResult 는 iframe 버전과 동일
}
export default new ExampleSearchPage();
```

#### spec 사용 모습 (Before → After)
```js
// Before: cy.get('iframe#mainFrame').its('0.contentDocument.body')... 셀렉터/콜백이 spec 에 직접 노출
// After (의도 단위 체이닝 — iframe/dom 동일):
exampleSearchPage.open().verifyTitle().search('keyword').verifyResult();
```

---

## 3. 적용 전략 (점진 마이그레이션)

기존 spec을 POM으로 옮길 때의 원칙. 새 프로젝트라면 처음부터 이 구조로 작성한다.

### 단계 및 커밋 분리
| 단계 | 내용 | 커밋 | 검증 |
|------|------|------|------|
| 1 | 골격 구축: `pages/base/*`, `components/`, `module/iframe.js`(필요 시 W4 수정, 하위호환 기본값) | A | 전체 spec 1회 실행 — 기존 동작 불변 확인 |
| 2 | 한 화면의 페이지 객체 추출 — 기존 코드 **verbatim 이관**(대기 로직·timeout 값·검증 콜백 변경 금지) | B | 해당 spec 반복 실행(`repeat`) 연속 통과 |
| 3 | 고정 `cy.wait` 교체(W1) — 건별로 조건 대기 전환, 불가 건은 헬퍼 격리 | C | 반복 실행 + 콜드 히트(첫 조회) 1회 관찰 |
| 4 | 확산: 화면 단위로 B/C 반복 | spec당 B/C | spec당 동일 기준 |

### 절대 원칙
1. **구조 이관(B)과 대기 개선(C)을 같은 커밋에 섞지 않는다** — 회귀 시 원인 분리가 가능해야 함.
2. 이관 중 "겸사겸사 정리" 금지 — 검증된 타이밍 로직은 그대로 옮긴다. 개선은 C 커밋에서만.
3. 반복 실행 통과 ≠ 콜드 히트 검증 (`repeat`은 웜 캐시일 수 있음) — C 커밋 후에는 캐시가 비워진 상태에서 1회 관찰한다.
4. 먼저 만든 화면의 스타일이 **표본** — 이후 화면은 표본과 다른 구조를 만들지 않는다.

---

## 4. 기존 자산과의 관계

| 자산 | 처리 |
|------|------|
| `e2e/module/iframe.js` | iframe 공용 헬퍼. `IframeBasePage` 가 위임. timeout 전파(W4)는 옵셔널 파라미터로 하위호환 |
| `pages/components/GridComponent.js` | 페이지가 합성(P4). `waitUntil` 게이트 주입으로 무상태(P2) 유지 |
| custom commands (`cy.login`, `cy.ModuleAdd`, `cy.getAll`, `Cypress.getDate`) | 그대로 유지 — POM과 무관 |
| `cypress.env.json` (gitignore, `cypress.env.example.json` 복사본) | 로그인/테스트 데이터 원천(P9). `loginEnvs` 의 `local`(SPA)/`iframeLegacy`(iframe) 키로 `cy.login(env)` 주입 |

---

## 5. 참고 출처

- Retry-ability (재시도 원리·체인 재실행): https://docs.cypress.io/app/core-concepts/retry-ability
- `.should()` (콜백 재시도·timeout 전파): https://docs.cypress.io/api/commands/should
- `.its()` (자체 timeout 옵션): https://docs.cypress.io/api/commands/its
- 고정 대기 안티패턴: https://docs.cypress.io/app/core-concepts/best-practices#Unnecessary-Waiting
- iframe 공식 패턴 (재취득 원칙): https://www.cypress.io/blog/working-with-iframes-in-cypress
- 공식 iframe 레시피: https://github.com/cypress-io/cypress-example-recipes/tree/master/examples/blogs__iframes
- custom command 1:1 래퍼 안티패턴: https://docs.cypress.io/api/cypress-api/custom-commands
- App Actions 논쟁 (POM 비판 원전): https://www.cypress.io/blog/2019/01/03/stop-using-page-objects-and-start-using-app-actions
- POM/App Actions 절충 (현재 컨센서스): https://applitools.com/blog/page-objects-app-actions-cypress/
- timeout 미전파 이슈: https://github.com/cypress-io/cypress/issues/2941 · https://github.com/cypress-io/cypress/issues/7427
