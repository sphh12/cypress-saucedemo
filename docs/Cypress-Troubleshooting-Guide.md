# Cypress 트러블슈팅 가이드 (iframe 레거시 웹앱)

> iframe 기반 레거시 어드민(예: ASP.NET WebForms + jQuery UI + Bootstrap)을 Cypress로 테스트할 때
> 반복적으로 부딪히는 **iframe / 셀렉터 / 타이밍** 문제와 그 해결 패턴을 정리한 문서입니다.
> 페이지명·데이터는 모두 일반 예시(Order List, User Detail 등)로 표기했으므로,
> 본인 프로젝트의 실제 페이지/필드 이름으로 바꿔서 활용하세요.

---

## 1. 이 가이드가 가정하는 환경 특성

- 화면 콘텐츠가 **iframe 안쪽**(`<iframe id="mainFrame">`)에 그려지는 구조
- 서버 렌더링 + form postback 방식 (버튼 클릭 → 폼 제출 → iframe 전체 리로드)
- jQuery / jQuery UI / Bootstrap 기반의 클래식 어드민 UI
- 테스트 대상이 실데이터/운영 유사 환경이면 **읽기 전용(검색·조회) 동작만** 수행

이 문서의 `getMainFrame()` / `#mainFrame` / `validatePage()` 는 템플릿의
`cypress/e2e/module/iframe.js` + `cypress/pages/base/IframeBasePage.js` 에 대응합니다.
(`getMainFrame()` 은 매 호출 시 iframe 안쪽 `body` 를 새로 취득합니다.)

---

## 2. 자주 발생하는 에러와 해결 방법

### 2-1. 페이지 타이틀 셀렉터 불일치

**증상:** `Expected to find element: h4.panel-title label, but never found it`

**원인:** 같은 UI 패턴이라도 페이지마다 타이틀 HTML 구조가 다름

| 페이지(예시) | HTML 구조 |
|--------|-----------|
| Order List | `<h4 class="panel-title"><label>텍스트</label></h4>` |
| User Detail | `<h4 class="panel-title">텍스트</h4>` |

**해결:**
```js
// AS-IS: label 태그 의존 (특정 페이지에서만 동작)
getMainFrame().find('h4.panel-title label').should('have.text', '...');

// TO-BE: h4.panel-title 직접 사용 (범용)
getMainFrame().find('h4.panel-title').should('have.text', '...');
```

**교훈:** 같은 UI 패턴이라도 페이지별로 DOM 구조가 다를 수 있으므로, 반드시 **페이지별로 DOM 구조를 확인**한 후 셀렉터를 작성한다.

---

### 2-2. 텍스트에 공백/줄바꿈 포함

**증상:** `expected '<h4.panel-title>' to have text 'User Verification Details', but the text was 'User Verification Details\n                            '`

**원인:** HTML 태그 안에 줄바꿈(`\n`)과 공백이 포함됨

```html
<!-- 실제 HTML -->
<h4 class="panel-title">User Verification Details
                            </h4>
```

**해결:**
```js
// AS-IS: 정확한 텍스트 일치 (공백에 민감)
getMainFrame().find('h4.panel-title').should('have.text', 'User Verification Details');

// TO-BE: 포함 여부만 확인 (공백에 안전)
getMainFrame().find('h4.panel-title').should('contain.text', 'User Verification Details');
```

**교훈:** `have.text` 는 공백/줄바꿈까지 **정확히 일치**해야 하므로, 타이틀 검증에는 `contain.text` 를 기본으로 쓰는 것이 안전하다.

---

### 2-3. DOM 분리(Detachment) 에러

**증상:** `cy.find() failed because the page updated as a result of this command... The subject is no longer attached to the DOM`

**원인:** Filter/Search 버튼 클릭 시 테이블이 재렌더링되면서, 이전에 찾은 DOM 요소가 새 요소로 교체됨. 체이닝된 다음 명령이 이미 사라진 옛 요소를 참조하려고 할 때 발생.

**비유:** 집 주소를 적어놨는데, 건물이 철거되고 새로 지어져서 옛 주소가 무효화된 것

**해결:**
```js
// AS-IS: 클릭 직후 바로 체이닝 → DOM 분리 위험
getMainFrame().find('input[value="Filter"]').click();
getMainFrame().find('table tbody').should('contain.text', 'TEST_USER');

// TO-BE: 재렌더링 대기 후 새로 탐색
getMainFrame().find('input[value="Filter"]').click();
cy.wait(3000);  // 테이블 재렌더링 대기 (가능하면 cy.intercept 로 응답 대기 권장)
getMainFrame().find('#grid_list_body tbody').should('contain.text', 'TEST_USER');
```

**교훈:** 버튼 클릭 후 페이지/테이블이 갱신되면, `cy.wait()` 또는 `cy.intercept()` 로 완료를 기다린 뒤 새로 `getMainFrame().find()` 로 요소를 다시 찾아야 한다.

> **참고:** 이 패턴은 같은 페이지 내에서 테이블만 재렌더링되는 경우(jqGrid Filter 등)에 해당합니다.
> `iframe.src` 자체가 변경되어 전체 페이지가 교체되는 경우에는 `getMainFrame()` 자체가 위험하므로
> **8-37 패턴(네이티브 DOM 접근)** 과 **8-38 패턴(타임아웃 전환)** 을 참고하세요.

---

### 2-4. 테이블 구조 차이 (thead 유무)

**증상:** 데이터가 있는데도 검색 결과 텍스트를 못 찾음. tbody에 헤더 텍스트만 보임.

**원인:** 페이지마다 테이블 구조가 다름

| 구조 | 설명 | 데이터 시작 위치 |
|------|------|-----------------|
| `<thead>` + `<tbody>` | 일반적인 구조 | tbody의 첫 번째 tr |
| `<tbody>` 만 사용 | 첫 tr이 헤더 역할 | tbody의 **두 번째 tr** (`eq(1)`) |

**해결:**
```js
// thead가 없는 테이블에서 데이터 row 접근
// 첫 row(eq(0))는 헤더이므로, eq(1)부터가 실제 데이터
getMainFrame().find('#grid_list_body tbody tr').eq(1).contains('button', 'View').click();
```

**교훈:** 테이블 셀렉터 작성 전 `<thead>` 존재 여부를 확인하고, 테이블 고유 ID(`#grid_list_body`)를 쓰는 것이 클래스 조합보다 안정적이다.

---

## 3. iframe 네이티브 팝업(alert/confirm) 처리

### 3-1. 상황별 처리 방법 선택

| 상황 | 방법 | 사용 함수 |
|------|------|-----------|
| 최상위 window의 alert/confirm | Cypress 자동 처리 | 별도 코드 불필요 |
| iframe의 alert/confirm (리로드 없음) | stub 교체 | `stubIframeDialogs()` |
| iframe의 alert/confirm (**폼 포스트백 후 발생**) | 응답 HTML 가로채기 | `cy.intercept()` |

### 3-2. stubIframeDialogs() — iframe 리로드가 없을 때

```js
import { stubIframeDialogs } from '../../module/iframe';

// iframe window의 alert/confirm을 stub으로 교체
stubIframeDialogs(true);  // confirm에 true(확인) 자동 응답

// 팝업을 발생시키는 동작 수행
getMainFrame().find('#someButton').click();

// stub 호출 여부 검증
cy.get('@alertStub').then(stub => {
    expect(stub).to.be.called;
    cy.log('팝업 메시지: ' + stub.firstCall.args[0]);
});
```

**한계:** 버튼 클릭으로 폼 포스트백(페이지 리로드)이 발생하면, iframe의 window 객체가 새로 생성되어 stub이 사라진다.

### 3-3. cy.intercept() — 폼 포스트백 후 팝업이 발생할 때 (권장)

**왜 필요한가?** 서버 렌더링 폼의 submit 버튼(`type="submit"`)을 클릭하면:
1. 폼 포스트백 발생 → iframe 완전히 새로 로드
2. 서버 응답 HTML에 인라인 `<script>alert('...')</script>` 포함
3. 브라우저가 HTML 파싱 중 alert를 **즉시 실행** → 네이티브 팝업 발생
4. Cypress가 팝업을 처리하지 못해 테스트 멈춤

`load` 이벤트 리스너로도 해결 불가 — alert는 HTML 파싱 중 실행되고, load는 파싱 **완료 후** 발생하므로 항상 늦음.

**해결 코드:**
```js
// 서버 응답 HTML이 브라우저에 도달하기 전에 가로채서 alert()를 변수 저장 코드로 바꿔치기
cy.intercept('POST', '**/Manage.aspx*', (req) => {
    req.continue((res) => {
        if (res.body && typeof res.body === 'string') {
            res.body = res.body.replace(
                /\balert\s*\(/g,
                'window.__cypressAlertMsg=('
            );
        }
    });
}).as('verificationRequest');

// 버튼 클릭 (폼 포스트백 발생)
getMainFrame().find('#btnVerification').click();

// 서버 응답 완료 대기
cy.wait('@verificationRequest');
cy.wait(2000);

// 저장된 팝업 메시지 검증
cy.get('iframe#mainFrame')
    .its('0.contentWindow.__cypressAlertMsg')
    .should('include', 'Success');
```

**동작 원리:**
```
[원래 흐름]
서버 응답 HTML → alert('Success...') → 네이티브 팝업 발생 → 테스트 멈춤

[cy.intercept 적용 후]
서버 응답 HTML → cy.intercept가 가로챔 → alert()를 window.__cypressAlertMsg=()로 치환
→ 브라우저가 변환된 HTML 파싱 → 팝업 없이 변수에 메시지 저장 → 테스트 계속 진행
```

---

## 4. 셀렉터 작성 모범 사례

### 4-1. 셀렉터 우선순위

```
1순위: ID 셀렉터          → #searchBy, #btnVerification
2순위: name 속성          → [name="btnLogin"]
3순위: 고유한 data 속성    → [data-testid="..."]
4순위: 클래스 조합         → .panel-title, .btn-primary
5순위: contains(텍스트)    → cy.contains('button', 'View')
```

### 4-2. 페이지별 확인된 셀렉터 기록 (예시 — 본인 프로젝트 값으로 채울 것)

페이지마다 타이틀/테이블/검색 버튼 구조가 다르므로, 작성하면서 아래처럼 표로 정리해두면 재사용에 유리합니다.

| 페이지 | 타이틀 셀렉터 | 테이블 셀렉터 | 검색 버튼 |
|--------|--------------|--------------|-----------|
| Order List | `h4.panel-title label` | `table.table-striped.table-bordered` | `#btnSearch` |
| User Detail | `h4.panel-title` (thead 없음) | `#grid_list_body` | `input[value="Filter"]` |
| ID Verification | `h4.panel-title` (공백 포함) | 없음 | `#btnViewDetail` |
| Log List | `should('contain.text', 'Transaction Log List')` | `table` | `input[value="Filter"]` (드롭다운 없음, ID 직접 입력) |

### 4-3. 텍스트 검증 방식 선택

```js
// have.text: 정확히 일치해야 함 (공백/줄바꿈 민감) → 깔끔한 텍스트에 사용
.should('have.text', 'User Detail List')

// contain.text: 포함되어 있으면 통과 (공백/줄바꿈 무시) → 타이틀/헤딩에 권장
.should('contain.text', 'User Verification Details')

// have.value: input/select의 value 속성 확인
.should('have.value', '100')
```

---

## 5. 코드 작성 전 필수 확인 사항

새 페이지의 테스트 코드를 작성하기 전 반드시 확인:

1. **페이지 타이틀 구조** — `<h4>` 안에 `<label>` 있는지, 공백/줄바꿈 있는지
2. **테이블 구조** — `<thead>` 존재 여부, 테이블 고유 ID, 헤더 row 위치
3. **검색/필터 요소** — select ID, input ID, 버튼 ID 또는 value
4. **버튼 타입** — `type="submit"`(포스트백) vs `type="button"`(AJAX)
5. **팝업 발생 여부** — alert/confirm 사용 여부, 발생 시점(리로드 전/후)

---

## 6. 디버깅 팁

### 6-1. Cypress 로그에서 에러 읽는 법

```
"Expected to find element: XXX, but never found it"
→ 셀렉터가 현재 페이지 DOM과 맞지 않음. DOM 구조 재확인.

"expected <element> to have text 'A', but the text was 'A\n   '"
→ 실제 텍스트에 공백/줄바꿈 포함. contain.text 사용.

"The subject is no longer attached to the DOM"
→ DOM 분리. 페이지/테이블 재렌더링 후 요소를 다시 찾아야 함.

"Timed out retrying after 5000ms"
→ 타임아웃 내 조건 미충족. wait 추가 또는 timeout 값 증가.
```

### 6-2. DOM 구조 빠르게 확인하기

Chrome DevTools Console에서 iframe DOM 직접 탐색:
```js
const doc = document.getElementById('mainFrame').contentDocument; // iframe 내부 문서
doc.querySelector('h4.panel-title');
doc.querySelector('#searchBy');
doc.querySelectorAll('table');
```

---

## 7. 패턴별 핵심 정리

> 원본 프로젝트에서 수십 개 페이지를 다루며 축적한 패턴 중, **재사용 가치가 있는 것만** 추렸습니다.
> (특정 페이지 1회성 케이스 덤프는 제외)

### 7-1. 포스트백 후 결과 대기 — `.should()` 콜백 재시도

포스트백(form submit)이 나면 iframe DOM이 통째로 교체됩니다. `.should('not.be.empty')` 는 포스트백 이전 페이지에서도 통과하므로 부적절합니다.

```js
// ❌ 포스트백 전 DOM에서도 통과
getMainFrame().find('body').should('not.be.empty');

// ✅ 결과가 나타날 때까지 재시도
getMainFrame().should($body => {
    const hasTable = $body.find('table.table-striped').length > 0;
    const hasNoData = $body.text().includes('No data found');
    expect(hasTable || hasNoData).to.be.true;
});
```

**핵심:** `.should()` 콜백은 assertion이 실패하면 자동 재시도합니다. 포스트백 완료로 실제 결과가 DOM에 나타날 때까지 반복 확인합니다.

### 7-2. iframe 내부 jQuery 활용 — DOM 참조 안정성

`getMainFrame().then($body =>` 로 캡처한 `$body` 는 스냅샷이라 포스트백 후 stale(분리)될 수 있습니다.

```js
// ❌ 스냅샷 DOM — 포스트백 후 분리됨
getMainFrame().then($body => {
    if ($body.find('table').length > 0) { ... }  // stale reference
});

// ✅ iframe의 live jQuery — 실시간 DOM 조회
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    const hasTable = win.jQuery('table.table-striped').length > 0;  // live reference
});
```

### 7-3. Filter/검색 버튼 — `button` vs `input` 모두 대응

버튼이 `<button>` 인지 `<input type="button">` 인지 모를 때:

```js
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    const $btn = win.jQuery('input[value="Filter"], button:contains("Filter")').first();
    $btn.click();
});
```

> `jQuery('button:contains("Filter")')` 는 `<input type="button" value="Filter">` 를 **찾지 못합니다.**
> Filter 버튼이 input 태그면 `input[value="Filter"]` 로 직접 매칭하세요.

### 7-4. getMainFrame() 반환값 주의

`getMainFrame()` 은 iframe의 `contentDocument.body` 를 반환합니다. 따라서:

```js
// ❌ body 안에서 body를 찾으려 함 — 항상 실패
getMainFrame().find('body').should('not.be.empty');

// ✅ 직접 body에 assertion
getMainFrame().should('not.be.empty');
```

### 7-5. iframe 로드 중 타이틀 확인 — 체이닝 회피

`getMainFrame().find('h4.panel-title').should(...)` 체이닝은 iframe 로드 중 DOM이 교체되면 이전 페이지(대시보드 등)의 요소를 읽을 수 있습니다.

```js
// ❌ 체이닝 — iframe 로드 중 DOM 교체로 대시보드 타이틀을 읽음
getMainFrame().find('h4.panel-title').should($el => {
    expect($el.text()).to.include('Transaction Log List');
});

// ✅ 직접 텍스트 확인 — 매번 iframe을 새로 조회하여 안정적
getMainFrame().should('contain.text', 'Transaction Log List');
```

**핵심:** `.find()` 체이닝은 한 번 잡은 DOM에서 하위 검색하므로, 중간에 iframe이 교체되면 stale 참조가 됩니다. `.should('contain.text', ...)` 는 매번 `getMainFrame()` 부터 재실행하므로 안전합니다.

### 7-6. 모달 팝업 애니메이션 대기

Bootstrap 모달의 `fade` 클래스는 `opacity: 0 → 1` 애니메이션을 적용합니다. 전체 실행 시 브라우저 부하로 애니메이션이 느려져 `be.visible` 이 실패할 수 있습니다.

```js
// ❌ 애니메이션 완료 전 확인 — opacity:0이면 실패
getMainFrame().find('#div_view_modal').should('be.visible');

// ✅ 대기 + CSS 속성 직접 확인
cy.wait(1000);
getMainFrame().find('#div_view_modal')
    .should('have.class', 'in')
    .and('have.css', 'opacity', '1');
```

### 7-7. 페이지별 검색 UI 구조 차이 — 패턴 추정 금지

같은 어드민이라도 페이지마다 검색 UI가 완전히 다를 수 있습니다. 반드시 **브라우저 DOM 분석 후** 코드를 작성하세요.

| 페이지(예시) | 검색 구조 |
|--------|----------|
| User Statement | 드롭다운(`#ddlSearchBy`) + 입력필드(`#txtSearchValue`) |
| Log List | 드롭다운 없음, 직접 입력 필드(`#log_CONTROLNO`) |
| Order List | 드롭다운(`#searchBy`) + 입력필드 |

### 7-8. iframe DOM 일괄 분석 — JavaScript 기법

테스트 코드 작성 전 페이지의 모든 요소를 한번에 추출하는 스크립트 (DevTools Console 또는 browser 자동화 도구의 javascript_tool에서 실행):

```js
var doc = document.getElementById('mainFrame').contentDocument;

// 1. 모든 input (id, name, type)
var inputs = [];
doc.querySelectorAll('input').forEach(i => inputs.push({id: i.id, name: i.name, type: i.type}));

// 2. 모든 select + option
var selects = [];
doc.querySelectorAll('select').forEach(s => {
    var opts = [];
    s.querySelectorAll('option').forEach(o => opts.push({value: o.value, text: o.textContent.trim()}));
    selects.push({id: s.id, name: s.name, options: opts});
});

// 3. 버튼 (button + input[type=button/submit])
var buttons = [];
doc.querySelectorAll('button, input[type="submit"], input[type="button"]')
   .forEach(b => buttons.push({id: b.id, text: (b.textContent.trim() || b.value)}));

// 4. 테이블 헤더
var headers = [];
doc.querySelectorAll('table th').forEach(th => headers.push(th.textContent.trim()));

JSON.stringify({inputs, selects, buttons, headers}, null, 2);
```

**활용:** 이 결과를 기반으로 셀렉터를 정확하게 작성. 패턴 추정보다 확실하고 에러 방지에 효과적.

### 7-9. `it.only` vs `it` — 개별/전체 실행 전환 주의

```js
it.only('...', function () { ... });  // 개별 실행 (이것만 실행됨)
it('...', function () { ... });       // 전체 실행
```

**주의:** `it.only` 가 파일에 남아있으면 그것만 실행되고 나머지는 스킵됩니다. 전체 실행 전 반드시 `it` 으로 되돌리세요.

### 7-10. window.open Stub — 새 창 결과 페이지 캡처

함수가 `window.open()` 으로 새 창에 결과를 띄우면 Cypress는 새 창을 제어할 수 없습니다. Stub으로 URL을 가로채 같은 iframe에 로드합니다.

```js
// Step 1: alert 억제 + window.open stub
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    win.alert = (msg) => { win.__suppressedAlert = msg; };
    cy.stub(win, 'open').callsFake((url) => {
        win.__newWindowUrl = url;          // URL 캡처
        return { focus: () => {} };         // 가짜 window 객체 반환
    });
});

// Step 2: 검색 실행 (window.open 트리거)
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => win.CheckFormValidation());

// Step 3: 캡처된 URL로 iframe 이동
cy.get('iframe#mainFrame').its('0.contentWindow')
    .its('__newWindowUrl').should('exist')
    .then(capturedUrl => {
        cy.get('iframe#mainFrame').then($iframe => { $iframe[0].src = capturedUrl; });
    });
```

**핵심:** `cy.stub()` 은 해당 iframe window가 살아있는 동안만 유효합니다. 페이지 리로드 시 stub이 사라지므로 리로드 전에 호출해야 합니다.
(`type="submit"` 버튼이라 stub 직후 form submit이 발생하면 → **7-11 패턴**으로 URL을 부모 window에 저장하세요.)

### 7-11. type="submit" + window.open — 부모 window에 URL 저장

`input[type="submit"]` 버튼에 `onclick="showReport()"` 핸들러가 있으면, onclick이 `window.open()` 을 호출한 **직후** form submit이 발생해 iframe이 리로드됩니다. 이때 contentWindow가 새 객체로 교체되므로, iframe window에 저장한 URL은 사라집니다.

**비유:** 메모지(contentWindow)에 URL을 적어놨는데 건물(iframe)이 재건축되며 메모지가 사라진 것. 메모를 건물 밖(부모 window)에 보관하면 안전합니다.

```js
// ✅ 부모 window에 저장 — iframe 리로드와 무관하게 유지
cy.window().then(parentWin => {
    parentWin.__summaryUrl = null;
    cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
        win.alert = (msg) => { win.__suppressedAlert = msg; };
        cy.stub(win, 'open').callsFake((url) => {
            parentWin.__summaryUrl = url;   // ← 부모 window에 저장
            return { focus: () => {} };
        });
    });
});
getMainFrame().find('#showReportBtn').click({ force: true }); // type="submit"
cy.window().its('__summaryUrl', { timeout: 10000 }).should('not.be.null')
    .then(capturedUrl => {
        cy.get('iframe#mainFrame').then($iframe => { $iframe[0].src = capturedUrl; });
    });
```

| 버튼 타입 | form submit | contentWindow 교체 | URL 저장 위치 |
|-----------|------------|-------------------|--------------|
| `type="button"` + onclick | 없음 | 유지됨 | iframe contentWindow (7-10) |
| `type="submit"` + onclick | 발생 | 교체됨 | **부모 window** (7-11) |

### 7-12. iframe.src 직접 이동 — 탭 전환 / 결과 페이지 로드

`CheckFormValidation()` 이 `location.href` 로 결과 페이지를 이동시키면 Cypress에서 가로챌 수 없습니다. 소스 분석으로 URL 패턴을 파악한 뒤 `iframe.src` 를 직접 설정합니다.

```js
const resultUrl = '/app/report/StatementResult.aspx?startDate=2026/03/09&endDate=2026/04/09&searchBy=email&searchValue=TEST_USER';
cy.get('iframe#mainFrame').then($iframe => { $iframe[0].src = resultUrl; });
cy.wait(3000);
```

**주의:** 결과 페이지는 검색 폼과 DOM 구조가 다르므로 `validatePage()` 사용 불가. `getMainFrame().should()` 로 테이블/텍스트 존재만 확인합니다. (`location.href` / `location` 객체는 브라우저 보안상 가로채기 불가하므로 URL을 직접 구성해 `iframe.src` 로 이동.)

### 7-13. jQuery UI autocomplete 데이터 추출

autocomplete 검색 후 결과 목록에서 내부 데이터(id, value)를 추출:

```js
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    const $input = win.jQuery('#search_aSearch');
    $input.val('TEST_USER').trigger('input');
    $input.autocomplete('search', 'TEST_USER');
});
cy.wait(2000);
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    const $firstItem = win.jQuery('.ui-menu-item').first();
    const itemData = $firstItem.data('uiAutocompleteItem')   // jQuery UI 1.10+
                  || $firstItem.data('item.autocomplete');    // jQuery UI 1.8
    win.jQuery('#search_aValue').val(itemData.id);
    win.jQuery('#search_aText').val(itemData.value);
});
```

**주의:** `.click()` 으로 항목을 선택하면 jQuery UI `select` 이벤트가 제대로 발생하지 않아 hidden 필드가 빈 값으로 전송됩니다. 반드시 `.data()` 로 내부 데이터를 추출 후 직접 설정하세요.

### 7-14. GNB 메뉴 내비게이션 — 드롭다운 + 서브메뉴 타이밍

2단계 드롭다운 메뉴는 각 단계 사이에 애니메이션 대기가 필요합니다.

```js
cy.get('#navbar-main > .nav > :nth-child(2) > .dropdown-toggle').click({ force: true });
cy.wait(2000);                                   // 드롭다운 애니메이션 대기
cy.contains('System Logs').trigger('mouseover');
cy.wait(2000);                                   // 서브메뉴 표시 대기
cy.contains('Log List').click({ force: true });
```

> `nth-child` 번호는 메뉴 순서에 대응합니다. 메뉴 구조가 바뀌면 번호도 바뀌므로, 가능하면 텍스트(`cy.contains`)와 병행하세요.

### 7-15. 로그인 후 오버레이/챗봇 대기 — beforeEach 필수

로그인 후 표시되는 오버레이(예: 챗봇, 공지 모달)가 사라지기 전에 테스트를 시작하면 클릭이 차단됩니다. 템플릿에서는 `cy.login('iframeLegacy')` 로 로그인을 캡슐화하고, 오버레이 소멸을 명시적으로 기다립니다.

```js
beforeEach(() => {
    cy.login('iframeLegacy');                                  // loginEnvs 에서 URL/셀렉터 주입
    // 로그인 후 오버레이가 있다면 사라질 때까지 대기 (있는 경우에만)
    cy.get('#app-overlay', { timeout: 20000 }).should('not.exist');
});
```

> 로그인 자격증명/URL/회사코드는 `cypress.env.json`(=`cypress.env.example.json` 복사본)의 `loginEnvs` 에서 주입됩니다.
> 코드에 `YOUR_USERNAME` / `YOUR_PASSWORD` / `YOUR_COMPANY_CODE` 등을 하드코딩하지 마세요.

### 7-16. Filter 버튼 중복 — `.first()` 필수

한 페이지에 Filter 버튼이 여러 개 존재할 수 있습니다(숨겨진 영역, 다른 패널 등).

```js
getMainFrame().find('input[value="Filter"]').first().click();  // 첫 번째만 클릭
```

### 7-17. validatePage() 후 타이틀 인식 실패 — stale body 문제

`validatePage()` 직후 `getMainFrame().should('contain.text', ...)` 로 타이틀을 확인하면, iframe DOM이 전환 중일 때 **부모(대시보드) body** 를 참조하여 실패할 수 있습니다.

```js
// ✅ iframe 요소부터 재쿼리 — 실패 시 처음부터 다시 조회
cy.wait(2000);
cy.get('iframe#mainFrame', { timeout: 15000 })
    .its('0.contentDocument.body')
    .should('contain.text', 'Transaction Log List');
```

**핵심:** `getMainFrame()` 은 `find()`, `click()` 등 **액션**에는 안전하지만, `validatePage()` 직후 **텍스트 존재 확인**에는 `cy.get('iframe#mainFrame')` 부터의 직접 체이닝이 안전합니다.

### 7-18. readonly 필드 — jQuery `.val()` 로 설정

datepicker, time 등 `readonly` 인 `<input>` 은 Cypress `.type()` 이 동작하지 않습니다.

```js
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    win.jQuery('#grid_createdDate').val('2026-04-16');
    win.jQuery('#grid_fromTime').val('00:00');
    win.jQuery('#grid_toTime').val('23:00');
});
```

> 일부 페이지는 필수 필드가 비면 Filter 클릭 시 "Required Field(s)" alert를 띄웁니다. Filter 전에 readonly 필수 필드를 jQuery로 먼저 채우세요.

### 7-19. `.type()` 값을 Nav()/검색 함수가 인식 못하는 경우

일부 그리드는 `.type()` 으로 입력한 값이 화면엔 보여도 내부 함수가 읽지 못해 0건 검색됩니다. jQuery `.val()` 설정 + 내부 함수 직접 호출로 해결합니다.

```js
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    win.jQuery('#grdAppEx_createdBy').val('TEST_USER');
});
cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    win.Nav(1, 'grdAppEx', false, 1);   // onchange 와 동일한 재조회
});
```

### 7-20. cy.contains() 부분 매칭 — 동일 텍스트 포함 메뉴 주의

`cy.contains('Error Logs')` 는 "Report **Error Logs**" 처럼 텍스트를 **포함하는** 첫 요소를 매칭합니다.

```js
// ✅ 정규식으로 정확히 'Error Logs'만 매칭
cy.contains('a', /^Error Logs$/).click({ force: true });
```

### 7-21. 팝업 차단 우회 — fetch로 HTML 가져와 데이터 추출

Cypress(및 Chrome)에서 `window.open()` 팝업은 차단됩니다. 팝업에서 데이터를 가져와야 하면, iframe의 `contentWindow.fetch` 로 직접 요청해 파싱하는 방법이 가장 확실합니다.

```js
const onclickStr = $link.attr('onclick');                 // "OpenInNewWindow('View.aspx?id=123')"
const remarkUrl = onclickStr.match(/OpenInNewWindow\('(.+?)'\)/)[1];

cy.get('iframe#mainFrame').its('0.contentWindow').then(win => {
    return cy.wrap(win.fetch(remarkUrl, { credentials: 'include' }).then(r => r.text()));
}).then(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const value = doc.querySelector('td:nth-child(2) span').textContent;  // 원하는 데이터 추출
});
```

**핵심:** `win.fetch()` 는 iframe의 `contentWindow` 에서 호출해야 상대 경로가 iframe 현재 URL 기준으로 해석되고, 세션 쿠키도 공유됩니다. 마스킹된 테이블 값 대신 상세 페이지에서 원본을 얻거나, 한 페이지에서 추출한 값을 다른 페이지 검색어로 쓸 때(같은 `it` 안에서 변수 공유) 유용합니다.

### 7-22. CSS `text-transform: uppercase` 로 인한 `contain.text` 불일치

화면에 대문자로 보여도 실제 HTML 텍스트는 다를 수 있습니다. `contain.text` 는 **실제 HTML 텍스트** 기준입니다.

```js
// ❌ 화면에 보이는 대로 — 실패
.should('contain.text', 'ORDER LIST');
// ✅ 실제 HTML 텍스트로 — 성공
.should('contain.text', 'Order List');
```

**확인:** DevTools에서 `textContent` 또는 `getComputedStyle(el).textTransform === 'uppercase'` 확인.

### 7-23. 검색 후 결과 데이터 검증 누락 주의

검색/필터 후에는 **반드시 결과 데이터 존재 여부**를 검증하세요. 타이틀만 확인하면 "페이지가 열렸다"만 증명할 뿐 "검색이 동작했다"는 증명이 안 됩니다.

```js
cy.get('iframe#mainFrame', { timeout: 15000 })
    .its('0.contentDocument.body').should('contain.text', 'Order History');

cy.get('iframe#mainFrame').its('0.contentDocument.body').then($body => {
    const rows = $body.find('table.table-striped tr');
    expect(rows.length, '데이터 행 존재').to.be.greaterThan(1);
});
```

데이터가 안 나오는 경우(권한 등)는 `cy.log` 로 사유를 명시합니다.

### 7-24. jQuery `.val()` select 설정 실패 — option text vs value 불일치

Cypress `.select('Order Id')` 는 option의 **text 또는 value** 를 매칭하지만, jQuery `.val()` 은 **value 속성만** 매칭합니다.

```html
<option value="orderId">Order Id</option>
<!--           ^value      ^표시 텍스트  -->
```

```js
// ✅ option text로 value 조회 후 설정
const select = win.jQuery('#searchCriteria');
const optionVal = select.find('option').filter(function () {
    return win.jQuery(this).text().trim().toLowerCase().replace(/\s/g, '') === 'orderid'; // 정규화 매칭
}).val();
select.val(optionVal).trigger('change');
```

> option 텍스트가 `'Order Id'`, `'OrderId'`, `'ORDER ID'` 등으로 들쭉날쭉하면, 위처럼 `toLowerCase().replace(/\s/g, '')` 정규화 매칭을 쓰세요.

### 7-25. Filter 결과 should() 오탐 — 초기 데이터로 조기 통과 방지

jqGrid Filter는 비동기입니다. should() 행 수 체크가 Filter 응답보다 먼저 실행되면, 이전 데이터(초기 로드)로 통과해버립니다.

```js
// ✅ 검색어 포함 이중 검증 — 결과 페이지에만 존재하는 조건 추가
cy.get('iframe#mainFrame', { timeout: 15000 }).should($iframe => {
    const body = $iframe[0].contentDocument.body;
    expect(body.querySelectorAll('table tr').length, 'Filter 결과 로드').to.be.greaterThan(1);
    expect(body.textContent, '검색 결과에 검색어 포함').to.include('TEST_USER');
});
```

**핵심:** should() 조건이 **Filter 전 상태에서도 통과 가능한지** 판단하고, 가능하면 검색어/고유 요소 등 결과 페이지에만 존재하는 조건을 추가하세요.

### 7-26. body 전체 텍스트 검색 시 다중 그리드 오탐 — 영역 제한

한 페이지에 그리드가 여러 개면 `body.textContent` 에 모든 그리드 텍스트가 합산됩니다. 숨겨진 탭의 빈 그리드 텍스트('Result 0 records')까지 잡혀 오탐이 납니다.

```js
// ✅ 특정 그리드 컨테이너로 제한
const gridArea = body.querySelector('#divGrid') || body;
const hasRecords = !gridArea.textContent.includes('Result 0 records');

// 또는: 테이블 행 수 + 더 구체적인 0건 텍스트 이중 체크
expect(body.querySelectorAll('table tr').length, '테이블 행').to.be.greaterThan(1);
expect(body.textContent, '0건 아님').to.not.include('Result 0 records');
```

**핵심:** 그리드가 2개 이상이면 body 전체 텍스트 검색을 피하고, 특정 컨테이너(`#divGrid`)로 범위를 제한하세요.

### 7-27. 브레드크럼 텍스트를 contain.text로 검증하면 실패

브레드크럼은 각 항목이 별도 `<a>` 태그라 연속 문자열로 매칭되지 않습니다.

```js
// ❌ 브레드크럼 합친 문자열 — 실패 ("Inbound Remittance" > "Search Details")
.should('contain.text', 'Inbound Remittance Search Details');
// ✅ 단일 요소(헤딩/패널 타이틀)의 연속 텍스트로 검증
.should('contain.text', 'Search Transaction Details');
```

---

## 8. iframe 콘텐츠 교체 후 DOM Detachment 종합 가이드 (가장 중요)

iframe 콘텐츠가 바뀌는 모든 상황에서, `getMainFrame()` 으로 body를 잡아 체이닝하면 DOM detachment가 납니다. body를 반환한 시점과 이후 `.contains()`/`.find()` 실행 시점 사이에 iframe이 리렌더링되면서 body 참조가 무효화되기 때문입니다.

### 8-1. DOM Detachment 유발 트리거

| 트리거 | 설명 | 예시 |
|--------|------|------|
| `iframe.src` 변경 | iframe 전체 페이지 교체 | `$iframe[0].src = '/path/page.aspx'` |
| **탭 클릭** | iframe 내부 탭 전환 → 리렌더링 | `find('a').contains('Details').click()` |
| **Filter/Search postback** | 버튼 클릭 → form submit → 리로드 | `find('input[value="Filter"]').click()` |
| **Nav() 호출** | 그리드 네비게이션 → 테이블 영역 교체 | `win.Nav(1, 'gridId', false)` |
| **메뉴 재진입** | 메뉴 클릭 → iframe.src 자동 변경 | `cy.contains('Orders').click()` |

이 중 하나라도 발생한 직후에는 `getMainFrame()` 대신 `cy.get('iframe#mainFrame').should()` 또는 `.then()` 패턴을 쓰세요.

**에러 메시지:**
```
CypressError: Timed out retrying after 5000ms: cy.contains() failed
because the page updated as a result of this command... The subject is no
longer attached to the DOM, and Cypress cannot requery the page...
```

**비유:** 택배 기사가 "3층 301호" 메모(body 참조)를 들고 갔는데, 건물이 재건축(iframe 리로드)되면서 3층이 사라진 상황. 건물 밖에서 기다렸다가 완공 후 직접 올라가야 합니다.

### 8-2. 해결법 3단계

**1단계: 로드 대기 — `should()` 콜백으로 원자적 검증**
```js
// ✅ iframe 요소에서 should 콜백 — 재시도마다 body를 새로 읽음
cy.get('iframe#mainFrame', { timeout: 10000 }).should(($iframe) => {
    const body = $iframe[0].contentDocument.body;
    expect(body).to.not.be.null;
    expect(body.textContent).to.include('Order Detail');
    const link = Array.from(body.querySelectorAll('a')).find(a => a.textContent.trim() === '50');
    expect(link, '링크 존재').to.not.be.undefined;
});
```
`should()` 콜백은 내부 assertion이 하나라도 실패하면 **전체를 재시도**하며, 매번 `$iframe[0].contentDocument.body` 를 새로 읽으므로 iframe이 교체돼도 항상 최신 body를 참조합니다.

**2단계: 클릭/조작 — `.then()` 안에서 네이티브 DOM 접근**
```js
// ✅ .then() 안에서 동기적으로 처리 — body 교체 틈이 없음
cy.get('iframe#mainFrame').then($iframe => {
    const body = $iframe[0].contentDocument.body;
    const link = Array.from(body.querySelectorAll('a')).find(a => a.textContent.trim() === '50');
    link.click();   // 네이티브 DOM 클릭
});
```

**3단계: 데이터 검증 — 로드 확인 후 네이티브 DOM 카운트**
```js
cy.get('iframe#mainFrame').then($iframe => {
    const body = $iframe[0].contentDocument.body;
    const cells = body.querySelectorAll('table tr td:first-child');
    const count = Array.from(cells).filter(c => /^\d+$/.test(c.textContent.trim())).length;
    expect(count).to.equal(50);
});
```

**판별 기준:**

| 상황 | 안전한 방법 | 위험한 방법 |
|------|-----------|-----------|
| iframe.src 변경 직후 텍스트 검증 | `cy.get('iframe').should()` 콜백 | `getMainFrame().should()` |
| iframe.src 변경 직후 요소 클릭 | `cy.get('iframe').then()` + 네이티브 click | `getMainFrame().contains().click()` |
| iframe.src 변경 직후 데이터 카운트 | `cy.get('iframe').then()` + querySelectorAll | `getMainFrame().find().then()` |
| iframe 변경 없이 안정된 페이지 조작 | `getMainFrame()` 사용 OK | — |

**핵심:** `iframe.src` 변경 직후에는 `getMainFrame()` 을 쓰지 마세요. iframe이 완전히 안정된 후(should 콜백 통과 후)에는 다시 써도 됩니다.

### 8-3. should 콜백 오탐 주의 — 텍스트 확인 vs 요소 확인

should 콜백에서 `body.textContent.includes('타이틀')` 로 전환을 확인할 때, **이전 페이지에도 같은 텍스트가 있으면** 아직 전환 전인데 통과해버립니다.

```js
// ❌ 텍스트 확인 — 결과/이전 페이지에도 같은 텍스트가 있으면 오탐
expect(body.textContent).to.include('Daily Report');

// ✅ 검색 폼 요소 확인 — 해당 페이지에만 존재하는 요소로 전환 완료 확인
expect(body.querySelector('#reportDateRange'), '검색 폼 요소 존재').to.not.be.null;
```

| 전환 방향 | 확인 방법 | 예시 |
|------|----------|------|
| 결과 → 결과 (내용 변경) | 새 페이지에만 있는 **텍스트** | `to.include('50 records')` |
| 결과 → 검색 폼 (복귀) | 검색 폼에만 있는 **요소(ID)** | `querySelector('#startDate')` not null |
| 검색 폼 → 결과 (최초 이동) | 결과 페이지에만 있는 **텍스트** | `to.include('Generated On')` |

특히 검색 페이지로 **복귀**할 때는 텍스트 대신 **검색 폼 요소의 존재 여부**로 확인해야 오탐을 막습니다.

### 8-4. 탭 전환/postback 후 폼 조작 — jQuery 직접 조작

탭 클릭/메뉴 재진입/postback 후 `getMainFrame().find('#fieldId').select('value')` 는 DOM Detachment를 일으킵니다. `cy.get('iframe#mainFrame').then()` + jQuery로 직접 조작하세요.

```js
// ✅ jQuery 직접 조작 — 탭 전환 후에도 안전
cy.get('iframe#mainFrame').then($iframe => {
    const win = $iframe[0].contentWindow;
    win.jQuery('#ddlSearchBy').val('cardNumber').trigger('change');
    win.jQuery('#searchValue').val('YOUR_ACCOUNT_NUMBER');
    win.jQuery('#searchMonth').val('2026-01');
});

// 버튼 클릭도 네이티브 DOM으로
cy.get('iframe#mainFrame').then($iframe => {
    const body = $iframe[0].contentDocument.body;
    const btn = Array.from(body.querySelectorAll('button')).find(b => b.textContent.includes('Search'));
    btn.click();
});
```

| 직전 액션 | getMainFrame() | jQuery 직접 조작 |
|-----------|----------------|------------------|
| 초기 페이지 진입 (validatePage 후) | 안전 | 불필요 |
| **탭 클릭 / 메뉴 재진입 / postback 후** | 위험 | 필수 |
| should() 확인 후 안정된 페이지 | 안전(후속 리렌더링 없을 때) | 선택 |

### 8-5. postback 후 탭 네비게이션 소실 — 메뉴 재진입

일부 페이지는 Search(postback) 후 결과 페이지로 완전 전환되며 기존 탭(List/Details/Statistics 등)이 사라집니다. 다른 탭으로 가려면 메뉴를 다시 클릭해 원래 페이지에 재진입합니다.

```js
// 메뉴 재진입 → 원래 페이지 로드 확인 → 탭 클릭
cy.get('#navbar-main > .nav > :nth-child(6) > .dropdown-toggle').click({ force: true });
cy.wait(2000);
cy.contains('Orders').click({ force: true });
cy.get('iframe#mainFrame', { timeout: 20000 })
    .its('0.contentDocument.body').should('contain.text', 'Order List');
cy.get('iframe#mainFrame').its('0.contentDocument.body')
    .find('a').contains('Statistics').click();
```

> 탭 유지 여부는 페이지마다 다르므로(검색 버튼이 `onclick="CheckFormValidation()"` 여도 postback 가능) 반드시 브라우저에서 실제 확인하세요.

### 8-6. cy.wait() → should 콜백 전환 가이드

`cy.wait(5000)` 같은 고정 대기를 제거하고, 조건 충족 시 즉시 넘어가는 타임아웃 방식으로 전환합니다.

**비유:** 라면 끓일 때 무조건 3분 타이머를 맞추는 대신, 면이 익었는지 직접 확인해 익으면 바로 꺼내는 방식. 2분에 익으면 2분에, 4분이면 4분에 넘어갑니다.

| cy.wait() 위치 | 전환 방법 | 이유 |
|---------------|----------|------|
| `iframe.src` 변경 후 (결과 로드) | `cy.get('iframe#mainFrame', { timeout: 10000 }).should()` 콜백 | 새 콘텐츠가 나타날 때까지 재시도 |
| 버튼 클릭 후 (stub URL 캡처) | **제거** — 이미 `.should('not.be.null')` 로 대기 중 | stub 콜백이 URL 저장할 때까지 자동 대기 |
| 검색 페이지 복귀 후 | should() + **요소(ID) 확인** | 텍스트 오탐 방지 |
| 메뉴 드롭다운 (2초) | **유지** — 애니메이션 대기 | CSS 전환엔 고정 대기가 적절 |

```js
// AS-IS: 무조건 5초 대기
cy.get('iframe#mainFrame').then($iframe => { $iframe[0].src = resultUrl; });
cy.wait(5000);
getMainFrame().should('contain.text', 'Generated On');

// TO-BE: 최대 10초 대기, 조건 충족 시 즉시 통과
cy.get('iframe#mainFrame').then($iframe => { $iframe[0].src = resultUrl; });
cy.get('iframe#mainFrame', { timeout: 10000 }).should(($iframe) => {
    const body = $iframe[0].contentDocument.body;
    expect(body).to.not.be.null;
    expect(body.textContent).to.include('Generated On');
});
```

**전환 후 체크리스트:**
1. `cy.wait(5000/3000)` 이 모두 제거되었는가? (`cy.wait(2000)` 메뉴 대기는 유지)
2. should 콜백 텍스트가 **이전 페이지에도 존재하지 않는가?** (오탐 방지)
3. should 콜백 다음에 `getMainFrame().find()` 가 남아있지 않는가? (detachment 방지)
4. 검색 페이지 복귀 시 텍스트 대신 **폼 요소 ID** 로 확인하는가?
5. 탭 전환 후 폼 조작에 **jQuery 직접 조작**(8-4)을 쓰는가?
6. Filter/Search postback 후 should 콜백에서 **데이터 행 체크**(7-25)를 함께 하는가?

### 8-7. Filter/Search postback 후 should() false positive — 데이터 행 체크 합침

원래 검색 폼 페이지의 타이틀이 결과 페이지 타이틀 텍스트를 **포함**하면, 텍스트만 체크하는 should()가 전환 전에 통과합니다(예: 원래 `"Order History List"` ⊃ 결과 `"Order History"`).

```js
// ✅ 데이터 행 체크를 should 안에 합침 — 결과 페이지 도착까지 재시도
cy.get('iframe#mainFrame', { timeout: 20000 }).should($iframe => {
    const body = $iframe[0].contentDocument.body;
    expect(body, 'iframe body 존재').to.not.be.null;
    const rows = body.querySelectorAll('table.table-striped tr');
    expect(rows.length, '데이터 행 존재').to.be.greaterThan(1);
});
```

데이터 행은 결과 페이지에만 존재하므로 오탐이 불가합니다. should 콜백의 텍스트 조건이 **이전 페이지에서도 통과하는지** 반드시 확인하세요.

---

## 9. 리포트/외부 시스템 연계 패턴

### 9-1. type="submit" → type="button" 동적 변경 — postback 완전 차단

`type="submit"` 버튼에 `onclick="ShowReport()"` 가 있을 때, stub으로 URL을 캡처해도 form POST가 동시에 발생해 iframe이 검색 폼으로 되돌아갑니다. onclick만 필요하면 클릭 직전에 type을 바꿔 postback을 원천 차단합니다.

```js
cy.get('iframe#mainFrame', { timeout: 10000 })
    .should($iframe => {
        expect($iframe[0].contentDocument.body.querySelector('#showReportBtn'), '버튼 존재').to.not.be.null;
    })
    .then($iframe => {
        const btn = $iframe[0].contentDocument.body.querySelector('#showReportBtn');
        btn.setAttribute('type', 'button');  // submit → button
        btn.click();                          // onclick만 실행, form POST 없음
    });
```

| 상황 | 권장 패턴 |
|------|----------|
| postback 후 페이지가 필요(폼 재입력 등) | 7-11 (부모 window 저장) |
| postback 불필요, onclick만 필요 | 9-1 (type 변경) |
| postback이 리포트 URL 접근을 방해 | 9-1 (type 변경) |

**비유:** 7-11은 "폭풍(postback)이 지나간 후 안전한 곳에서 메모를 꺼내는 것", 9-1은 "폭풍 자체를 막는 것".

### 9-2. 상대경로 URL → 절대경로 변환 — `new URL()` API

`window.open` 이 캡처한 URL이 `../../../report/Reports.aspx?...` 같은 상대경로면, 단순 문자열 결합(`base + url`)으로는 `../` 가 해석되지 않습니다.

```js
// ✅ new URL() — 상대경로를 정규화된 절대경로로 변환
if (url && !url.startsWith('http') && !url.startsWith('/')) {
    try {
        const base = new URL(iframeBasePath, window.location.origin);
        const resolved = new URL(url, base);
        parentWin.__reportUrl = resolved.pathname + resolved.search;
    } catch (e) {
        parentWin.__reportUrl = iframeBasePath + url;
    }
}
```

**비유:** 네비에 "여기서 뒤로 6칸 가서 오른쪽" 같은 상대 경로 대신, `new URL()` 은 "○○시 ○○구 ○○로 123" 같은 절대 주소로 변환해줍니다. `pathname + search` 로 경로와 쿼리스트링만 깔끔히 분리합니다.

### 9-3. 별도 인증 시스템 + cy.request() — iframe 세션 우회

리포트가 메인 어드민과 **별도 인증 세션**을 쓰는 경우, 캡처한 리포트 URL을 `iframe.src` 로 설정하면 로그인 페이지로 리다이렉트됩니다(iframe 컨텍스트엔 리포트 시스템 세션 쿠키가 없음).

**해결: (1) 리포트 시스템 사전 로그인 → (2) `cy.request()` 로 HTTP 응답 검증.** `cy.request()` 는 Cypress 메인 브라우저 쿠키를 쓰므로 사전 로그인 세션이 유지됩니다.

```js
// Step 0: 리포트 시스템 사전 로그인 (iframe을 로그인 페이지로 이동 후 자격증명 입력)
cy.get('iframe#mainFrame').then($iframe => { $iframe[0].src = '/report-system/Account/Login'; });
cy.get('iframe#mainFrame', { timeout: 10000 }).should($iframe => {
    expect($iframe[0].contentDocument.body).to.not.be.null;
});
cy.get('iframe#mainFrame').then($iframe => {
    const doc = $iframe[0].contentDocument;
    if (doc.querySelector('#txtUsername')) {
        doc.querySelector('#txtUsername').value = Cypress.env('reportUser');     // env 주입
        doc.querySelector('#txtPwd').value      = Cypress.env('reportPass');
        doc.querySelector('#btnLogin').click();
    }
});
cy.wait(3000);

// 리포트 검증: cy.request() 로 HTTP 응답 HTML 검증
cy.window().its('__reportUrl').then(capturedUrl => {
    cy.request({ url: capturedUrl, failOnStatusCode: false }).then(response => {
        expect(response.status, 'HTTP 200 OK').to.eq(200);
        expect(response.body, '테이블 존재').to.include('<table');
    });
});
```

> 자격증명은 코드에 하드코딩하지 말고 `cypress.env.json`/환경변수에서 주입하세요(`Cypress.env('reportUser')` 등).

| 방법 | 세션 공유 | 결과 |
|------|----------|------|
| `iframe.src = url` | iframe 컨텍스트 쿠키 | 리포트 시스템 세션 유지 안됨 |
| `cy.request(url)` | Cypress 메인 브라우저 쿠키 | 사전 로그인 세션 유지됨 |

**비유:** `iframe.src` 변경은 "직원에게 다른 건물 가서 서류 가져오라"는 것인데 직원이 출입증이 없어 로비에서 막힙니다. `cy.request()` 는 "양쪽 건물 출입 권한이 있는 사장이 직접 받아오는 것"입니다.

---

## 10. 간헐 실패(Flaky) 디버깅 패턴

### 10-1. 행 수 카운트 레이스 — 점진 렌더링 중 일회성 `.then()` 카운트 금지

**증상:** 같은 데이터인데 실행마다 세어지는 값이 다름(`expected 42 to equal 100`, `expected 71 to equal 100`). 페이지 자체는 정상 로드됨.

**원인:** 브라우저가 큰 표를 점진적으로 렌더링한다. 'Generated On' 같은 헤더 텍스트는 표 본문보다 먼저 나타나므로, 헤더 확인 직후 행을 세면 본문이 덜 그려진 시점의 부분 카운트가 나온다. `.then()` 은 한 번만 실행되고 재시도하지 않으므로 그대로 실패한다.

**판별 지문:** 카운트 값이 실행마다 널뛴다(42 → 71 → 100) = 데이터 문제가 아니라 **렌더링 타이밍 문제**.

```js
// ❌ 일회성 .then() — 본문이 덜 그려진 시점에 한 번 세고 끝
getMainFrame().find('table tr td:first-child').then($cells => {
    const dataCount = Cypress.$.makeArray($cells).filter(c => /^\d+$/.test(c.textContent.trim())).length;
    expect(dataCount).to.equal(100);
});

// ✅ should() 콜백 — 기대 개수 도달까지 자동 재시도
cy.get('iframe#mainFrame', { timeout: 15000 }).should($iframe => {
    const body = $iframe[0].contentDocument.body;
    const cells = body.querySelectorAll('table tr td:first-child');
    const dataCount = Array.from(cells).filter(c => /^\d+$/.test(c.textContent.trim())).length;
    expect(dataCount, '상세 행 수').to.equal(100);
});
```

**핵심:** "타이틀/헤더 텍스트 확인 통과" ≠ "표 렌더링 완료". **개수·합계처럼 본문 전체에 의존하는 검증은 반드시 should() 콜백 재시도**로 작성한다.

### 10-2. 간헐 실패 반복 디버깅 — `cy.writeFile` 누적 파일 로그

간헐 실패를 cypress-repeat으로 반복 재현할 때 로그 수집의 함정 3가지:

| 함정 | 내용 |
|------|------|
| cy.log는 터미널에 안 찍힘 | command log(GUI/HTML 리포트)에만 표시 |
| HTML 리포트는 회차마다 덮어쓰기 | 매 실행 시작 시 reports 폴더 삭제 → 마지막 회차만 남음 |
| cypress-repeat은 첫 실패에서 중단 | 실패 회차 이후는 실행 안 됨 |

**해결:** `cy.writeFile(..., { flag: 'a+' })` append 기록은 리포트 덮어쓰기와 무관하게 **전 회차가 파일에 보존**된다.

```js
// afterEach에서 회차별 상태를 파일에 누적 (테스트가 실패해도 afterEach는 실행됨)
afterEach(function () {
    const state = this.currentTest ? this.currentTest.state : '?';
    cy.writeFile('cypress/diag-log.txt',
        new Date().toISOString() + ' [' + state + '] ' + (Cypress.env('diagInfo') || '(미기록)') + '\n',
        { flag: 'a+' });
});
```

- `should()` 콜백 안에서는 `cy.*` 명령을 못 쓰므로, 상태는 콜백 안에서 `Cypress.env('diagInfo', ...)` 로 기록해두고 afterEach에서 파일로 출력한다(재시도 시 마지막 상태 = 타임아웃 직전 상태 포착).
- 재사용 헬퍼: `module/iframe.js` 의 `logIframeState('라벨')` — iframe URL + 본문 앞 150자를 cy.log + diag-log.txt에 기록. `--env DIAG=true` 일 때만 동작하므로 평소 실행엔 영향 없음.

**핵심:** 간헐 버그는 "실패 순간의 상태"를 남기는 게 전부다. 리포트·터미널에 의존하지 말고 **append 파일로 전 회차를 기록**하라. 핵심 진단 항목은 iframe의 **현재 URL**(assertion 에러엔 안 나옴)과 본문 앞부분이다.

### 10-3. 서버 즉석 생성 리포트 대기 기준 — 응답 시간 실측

**증상:** 매 요청마다 DB 조회 → HTML 즉석 생성하는 리포트의 로드 대기가 간헐 타임아웃. `iframe.src` 를 바꿔도 응답이 올 때까지 브라우저는 이전 문서를 계속 표시하므로, 타임아웃 시점 화면엔 이전 페이지가 남는다.

**기준:** 즉석 생성 리포트의 로드 대기는 관측 최악값의 **약 2~3배 마진**으로 timeout을 잡는다(예: 콜드 히트 ~21초 관측 시 timeout 60초).

**응답 시간 실측 기법 (브라우저 콘솔, 검색 폼 페이지에서):**
```js
// ① window.open 가로채 리포트 URL 캡처 (type 변경으로 postback 차단 — 9-1)
let captured; window.open = u => { captured = u; return { focus() {} }; };
const btn = document.querySelector('input[value="Show Report"]');
btn.setAttribute('type', 'button'); btn.click();

// ② 캡처된 URL을 timed fetch — 여러 번 반복해 콜드/웜 분포 확인
const t0 = performance.now();
await fetch(captured, { credentials: 'include' }).then(r => r.text());
console.log(Math.round(performance.now() - t0) + 'ms');
```

**타임아웃 시점의 화면이 말해주는 것:**

| 화면 상태 | 의미 | 처방 |
|----------|------|------|
| 이전 페이지 그대로 | 응답 미도착 (지연/정체) | 실측 후 timeout 상향 |
| 로그인/대시보드 | 인증 리다이렉트 | 사전 로그인 + cy.request (9-3) |
| 검색 폼 (직전에 리포트를 띄웠는데) | postback 덮어쓰기 | type="button" 전환 (9-1) |

**핵심:** 간헐 타임아웃은 추측으로 timeout을 올리지 말고, **실측으로 콜드/웜 분포를 확인한 뒤 최악값의 2~3배**로 설정한다.

---

## 11. 환경/실행 관련 잡학

### 11-1. 파일/폴더명 특수문자(`\r`) 혼입 — Windows 주의

Windows에서 셸 스크립트 실행 시 줄바꿈 문자(`\r`)가 폴더명에 섞일 수 있습니다(같은 이름 폴더가 2개로 보이는 증상).

```bash
# 실제 이름 확인 (Python)
python3 -c "import os; [print(repr(e)) for e in os.listdir('.') if 'history' in e]"
# → 'cypress-history' (정상) / 'cypress-history\r\r' (비정상)
```

**예방:** `.sh` 스크립트는 작성 후 CRLF → LF 변환(`sed -i '' 's/\r$//'`)을 수행하세요. (`bad interpreter: /bin/bash^M` 에러 예방)

### 11-2. 파일 편집 후 NUL(`\x00`) 문자 혼입 — Cypress 파싱 에러

일부 에디터/스크립트 편집 후 파일에 NUL 문자가 삽입되면 Cypress 파싱 에러가 납니다. 편집 후 파일 끝을 확인하고, 필요 시 제거하세요.

```bash
python3 -c "open('파일','wb').write(open('파일','rb').read().replace(b'\x00', b''))"
```

### 11-3. `debugger;` 문 주의

애플리케이션 소스에 `debugger;` 가 남아있으면 DevTools가 열린 상태에서 실행이 중단됩니다. `debugger;` 는 DevTools가 열려있을 때만 동작하므로, DevTools를 닫고 실행하면 자동 무시됩니다.

---

## 12. 핵심 원칙 요약

1. **페이지마다 DOM 구조를 직접 확인하라.** 같은 어드민이라도 타이틀/테이블/검색 UI가 다르다. 패턴 추정 금지(7-7, 7-8).
2. **타이틀 검증은 `contain.text`,** `have.text` 는 공백/줄바꿈에 민감(2-2).
3. **iframe.src 변경·탭 클릭·postback 직후엔 `getMainFrame()` 금지.** `cy.get('iframe#mainFrame').should()/.then()` + 네이티브 DOM 사용(8장 전체).
4. **검증은 should() 콜백 재시도로.** `.then()` 일회성 카운트는 점진 렌더링 중 부분값을 잡는다(7-1, 10-1).
5. **should 콜백 텍스트가 이전 페이지에도 있으면 오탐.** 결과 페이지에만 있는 데이터 행/요소 ID로 확인(8-3, 8-7).
6. **검색 후엔 결과 데이터 존재를 반드시 검증.** 타이틀만으론 "검색 동작"이 증명되지 않는다(7-23).
7. **고정 `cy.wait` 대신 조건 기반 timeout.** 단, 메뉴 애니메이션 대기는 유지(8-6).
8. **간헐 타임아웃은 실측 후 최악값의 2~3배로 설정.** 추측으로 올리지 말 것(10-3).
9. **자격증명/URL/회사코드는 `loginEnvs`(cypress.env.json)에서 주입.** 코드 하드코딩 금지(7-15).
