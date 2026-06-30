# Cypress 예제(Kitchen Sink) 가이드

> 출처: https://example.cypress.io/  (Cypress Kitchen Sink 예제 앱)
> 이 문서는 example.cypress.io 가 시연하는 모든 명령 카테고리를 분석해 정리한 한국어 레퍼런스다.
> 유사 케이스 구현이나 에러 해결 시 아래 목차에서 해당 섹션을 찾아 참고한다.
> 표기 규칙: 산문 한국어 / 코드·식별자 영어 / 코드 주석 한국어. 기준 버전: Cypress 13+.

## 목차

1. [Querying — 요소 조회](#querying) — cy.get·cy.contains·.within·cy.root·.find 등 DOM 요소를 조회하는 명령과 data-* 셀렉터 모범사례
2. [Traversal — DOM 탐색](#traversal) — .find/.parent/.siblings 등 18개 DOM 탐색 명령으로 이미 선택한 요소를 기준 삼아 자식·부모·형제로 이동하고 범위를 좁히는 방법.
3. [Actions — 사용자 동작](#actions) — 입력·클릭·체크·선택·스크롤·파일첨부 등 실제 사용자 동작을 시뮬레이션하는 명령 모음과 force 옵션 활용법
4. [Window — 윈도우/문서](#window) — cy.window·cy.document·cy.title 로 브라우저 전역 객체(window)·문서(document)·문서 제목에 접근하고 검증하는 방법
5. [Viewport — 화면 크기](#viewport) — cy.viewport()로 테스트 중 브라우저 화면 크기를 픽셀·디바이스 프리셋·방향으로 제어하기
6. [Location — URL/위치](#location) — cy.hash·cy.location·cy.url 로 현재 페이지의 URL 구성요소(해시·전체 URL·location 객체)를 조회하고 검증하는 방법
7. [Navigation — 페이지 이동](#navigation) — 브라우저 히스토리 이동·새로고침·원격 페이지 방문을 다루는 cy.go / cy.reload / cy.visit 명령 레퍼런스
8. [Assertions — 검증](#assertions) — 암시적 .should/.and, 명시적 expect/assert, 콜백 .should(fn)와 자주 쓰는 chainer 표를 다루는 Cypress 검증 명령 레퍼런스
9. [Misc — 기타](#misc) — cy.end · cy.exec · cy.focused · cy.wrap · cy.task 등 어느 카테고리에도 속하지 않는 보조 명령 모음
10. [Connectors — 값 연결](#connectors) — .each / .its / .invoke / .spread / .then — 명령 체인 사이에서 값을 꺼내고, 순회하고, 다음 단계로 연결하는 커넥터 명령
11. [Aliasing — 별칭](#aliasing) — .as 로 DOM·route·request 에 별칭을 저장하고 @alias 로 재사용하는 패턴
12. [Waiting — 대기](#waiting) — cy.wait(ms) 고정대기와 cy.wait(@alias) 네트워크 라우트 대기로, 안정적인 비동기 대기 패턴을 시연한다.
13. [Network Requests — 네트워크](#network) — cy.request로 실제 HTTP 요청을, cy.intercept로 요청 가로채기·스텁·별칭·대기를 다루는 네트워크 명령 모음
14. [Files — 파일](#files) — cy.fixture·readFile·writeFile로 테스트 데이터를 로드하고 파일을 읽고 쓰는 방법
15. [Storage & Cookies — 저장소/쿠키](#storage) — localStorage 초기화와 쿠키 읽기/쓰기/삭제(getCookie·setCookie·clearCookies 등)를 시연하는 카테고리
16. [Spies, Stubs & Clocks — 스파이/스텁/시계](#spies) — sinon 기반 cy.spy·cy.stub·cy.clock·cy.tick으로 함수 호출 감시·동작 가로채기·시간 제어를 시연한다.
17. [Utilities — 유틸리티](#utilities) — Cypress가 번들로 제공하는 유틸리티 라이브러리(Lodash, jQuery, Blob, minimatch, Bluebird Promise)를 별도 설치 없이 호출하는 방법.
18. [Cypress API — 전역 API](#api) — Cypress.* 전역 객체로 설정·환경변수·커스텀 명령·플랫폼 정보·세션 캐시를 다루는 레퍼런스
19. [공통 에러 패턴 & 디버깅](#common-errors) — Cypress 실무·예제에서 가장 자주 만나는 13가지 에러 메시지의 원인과 해결법, 짧은 코드 예제 모음
20. [실전 적용 가이드](#project-apply) — example.cypress.io 표준 패턴을 iframe 레거시·POM·flaky 실무(이 템플릿 구조)에 적용하는 6개 영역 가이드

---

<a id="querying"></a>

## 1. Querying — 요소 조회

이 카테고리는 페이지에서 DOM 요소를 찾아 잡아오는(querying) 핵심 명령들을 시연한다. CSS 셀렉터, 텍스트 매칭, 범위 한정, 루트 기준 탐색까지 "어떻게 안정적으로 요소를 선택하는가"가 주제다.

Cypress의 조회 명령은 모두 **재시도(retry-ability)** 가 내장돼 있다. 요소가 즉시 없어도 `defaultCommandTimeout`(기본 4초) 동안 자동으로 다시 찾으므로, `wait`이나 수동 폴링이 거의 필요 없다.

### cy.get

CSS 셀렉터(또는 alias)로 하나 이상의 DOM 요소를 조회한다. jQuery `$()`와 같은 역할이지만 재시도가 붙는다.

문법: `cy.get(selector, options)` / `cy.get('@alias')`

```javascript
// id, class, 복합 CSS 셀렉터로 조회
cy.get('#query-btn').should('contain', 'Button')
cy.get('.query-btn').should('contain', 'Button')
cy.get('#querying .well>button:first').should('contain', 'Button') // 자식·:first 결합

// data-* 속성 셀렉터 (권장 방식)
cy.get('[data-test-id="test-example"]').should('have.class', 'example')

// 조회한 요소의 속성/CSS를 invoke로 꺼내 검증
cy.get('[data-test-id="test-example"]')
  .invoke('attr', 'data-test-id')
  .should('equal', 'test-example')

cy.get('[data-test-id="test-example"]')
  .invoke('css', 'position')
  .should('equal', 'static')

// 여러 단언을 .and로 체이닝
cy.get('[data-test-id="test-example"]')
  .should('have.attr', 'data-test-id', 'test-example')
  .and('have.css', 'position', 'static')
```

자주 겪는 에러와 해결:
- `Timed out retrying ... Expected to find element: '...', but never found it.` → 셀렉터가 틀렸거나 요소가 아직 렌더 전 → 셀렉터를 DevTools에서 검증하고, 동적 로딩이면 `cy.get(sel, { timeout: 10000 })`로 타임아웃을 늘린다.
- `cy.get() found more than one element` (단일 요소 단언 시) → 셀렉터가 여러 요소에 매칭 → `:first` / `.eq(n)` / `.first()`로 좁히거나 셀렉터를 더 구체화한다.

### cy.contains

지정한 텍스트(또는 정규식)를 포함하는 요소를 조회한다. 사람이 보는 화면 텍스트로 찾을 때 유용하다.

문법: `cy.contains(content)` / `cy.contains(selector, content)` / `.contains(content)`

```javascript
// 텍스트 'bananas'를 가진 요소를 찾아 클래스 검증
cy.get('.query-list')
  .contains('bananas').should('have.class', 'third')

// 정규식 매칭: b로 시작하는 단어
cy.get('.query-list')
  .contains(/^b\w+/).should('have.class', 'third')

cy.get('.query-list')
  .contains('apples').should('have.class', 'first')

// selector + content: 'oranges'를 포함하는 ul 요소만
cy.get('#querying')
  .contains('ul', 'oranges')
  .should('have.class', 'query-list')

// 버튼 텍스트로 조회
cy.get('.query-button')
  .contains('Save Form')
  .should('have.class', 'btn')
```

| 형태 | 동작 |
|------|------|
| `cy.contains('text')` | 텍스트를 가진 **가장 안쪽(가장 깊은)** 요소를 반환 |
| `cy.contains('ul', 'text')` | 해당 selector 중 텍스트를 포함하는 첫 요소 |
| `cy.contains(/regex/)` | 정규식으로 매칭 (대소문자 구분 주의) |

자주 겪는 에러와 해결:
- 의도한 부모가 아닌 자식 `<span>` 등이 잡힘 → `cy.contains()`는 가장 깊은 요소를 우선 → selector 인자를 함께 줘서 `cy.contains('ul', 'oranges')`처럼 태그를 고정한다.
- 부분 일치로 엉뚱한 요소가 잡힘 → `contains`는 기본 부분 일치 → 정확 일치가 필요하면 정규식 `/^정확한문구$/`을 사용한다.

### .within

직전에 조회한 요소를 **범위(scope)** 로 고정하여, 콜백 안의 모든 조회를 그 요소 하위로 한정한다.

문법: `.within((subject) => { ... })`

```javascript
// .query-form 내부로 범위를 한정 — 폼 밖의 input은 잡히지 않음
cy.get('.query-form').within(() => {
  cy.get('input:first').should('have.attr', 'placeholder', 'Email')
  cy.get('input:last').should('have.attr', 'placeholder', 'Password')
})
```

자주 겪는 에러와 해결:
- `within` 콜백 안에서 `cy.get`이 범위 밖 요소를 잡음 → modal/overlay가 DOM상 폼 바깥에 렌더되는 경우 → `.within`은 DOM 트리 기준이므로, 범위 밖 요소는 콜백 밖에서 별도로 조회한다.
- 콜백에서 값을 `return`해도 체이닝이 끊김 → `.within`의 반환 subject는 원래 요소 → 내부 값은 `.then` 또는 alias(`.as()`)로 밖으로 전달한다.

### cy.root

현재 조회 범위의 **루트 요소** 를 반환한다. `.within` 밖에서는 `document` 루트(보통 `html`), 안에서는 그 범위 요소가 루트가 된다.

문법: `cy.root()`

```javascript
// 범위 지정이 없으면 루트는 html
cy.root().should('match', 'html')

// .within 안에서는 해당 요소가 루트가 됨
cy.get('.query-ul').within(() => {
  cy.root().should('have.class', 'query-ul')
})
```

### .find

현재 subject의 **하위(자손)** 에서 셀렉터로 요소를 조회한다. `cy.get`이 document 전체에서 찾는 것과 달리, `.find`는 직전 요소 내부만 탐색한다.

문법: `.find(selector, options)`

```javascript
// .query-list 하위의 li 중 첫 번째만 조회 (전역 검색 아님)
cy.get('.query-list')
  .find('li')
  .first()
  .should('contain', 'apples')
```

자주 겪는 에러와 해결:
- `.find()`가 자기 자신을 못 찾음 → `.find`는 **자손만** 탐색하고 subject 자신은 제외 → 자신 포함 매칭이 필요하면 `.filter()`를 쓰거나 `cy.get`으로 다시 조회한다.

### data-* 권장 셀렉터 (모범사례)

Cypress 공식 권장은 테스트 전용 속성 `data-cy` / `data-test` / `data-testid`로 요소를 조회하는 것이다. 클래스·태그·텍스트는 스타일/문구 변경에 쉽게 깨지지만, 테스트 전용 속성은 그 목적이 명확해 리팩터링에 강하다.

| 셀렉터 | 권장도 | 이유 |
|--------|--------|------|
| `cy.get('[data-cy="submit"]')` | ✅ 최선 | 테스트 전용, 변경에 안전 |
| `cy.get('[data-test="submit"]')` | ✅ 좋음 | 동일 목적 속성 |
| `cy.contains('Submit')` | △ 상황별 | 사용자 관점 텍스트지만 문구 변경에 취약 |
| `cy.get('.btn-primary')` | ❌ 비권장 | CSS 클래스는 스타일 변경 시 깨짐 |
| `cy.get('#submit')` | ❌ 비권장 | id는 JS/CSS와 결합되어 바뀌기 쉬움 |

```javascript
// 권장: 마크업에 data-cy 부여 후 조회
// <button data-cy="submit">Submit</button>
cy.get('[data-cy="submit"]').click()
```

> 💡 실무 팁: 모든 상호작용 요소에 `data-cy`를 붙여 두면 디자인·문구 리팩터링이 일어나도 테스트가 거의 깨지지 않는다. 또한 과거의 `cy.server`/`cy.route`는 **deprecated** 이므로 네트워크 가로채기는 `cy.intercept`를 사용하고, 조회 후에는 `wait` 대신 Cypress의 자동 재시도 단언(`.should`)에 맡기는 것이 안정적이다.

---

<a id="traversal"></a>

## 2. Traversal — DOM 탐색

이 카테고리는 `cy.get()`으로 선택한 요소를 출발점 삼아 자식·부모·형제·인덱스 방향으로 DOM 트리를 탐색(traversal)하고, 그 과정에서 대상 집합을 좁혀 나가는 jQuery 스타일 명령들을 시연한다. 모든 명령은 "이전 subject(요소 집합)"를 받아 새 집합을 yield하므로 체이닝으로 자연스럽게 연결된다.

| 방향 | 명령 |
|------|------|
| 아래(자손) | `.children` `.find` |
| 위(조상) | `.parent` `.parents` `.parentsUntil` `.closest` |
| 옆(형제) | `.siblings` `.next` `.nextAll` `.nextUntil` `.prev` `.prevAll` `.prevUntil` |
| 필터/인덱스 | `.eq` `.filter` `.not` `.first` `.last` |

### .children

직계 자식 요소만 가져온다(손자 이하는 제외). 선택자를 넘기면 그중 일치하는 자식만 남긴다.

문법: `.children()` / `.children(selector)`

```js
// .traversal-breadcrumb 의 직계 자식 중 .active 클래스를 가진 것만 선택
cy.get('.traversal-breadcrumb')
  .children('.active')
  .should('contain', 'Data')   // 텍스트에 'Data' 포함 확인
```

### .closest

자기 자신부터 위로 올라가며 선택자와 처음 일치하는 가장 가까운 조상 하나를 찾는다. `.parents`와 달리 위로 올라가다 최초 매치에서 멈춘다.

문법: `.closest(selector)`

```js
// .traversal-badge 에서 가장 가까운 ul 조상을 찾음
cy.get('.traversal-badge')
  .closest('ul')
  .should('have.class', 'list-group')  // 그 ul 이 list-group 클래스인지 확인
```

### .eq

집합에서 0부터 시작하는 인덱스로 하나의 요소만 선택한다. 음수 인덱스는 뒤에서부터 센다.

문법: `.eq(index)`

```js
// .traversal-list 의 li 중 두 번째(인덱스 1) 선택
cy.get('.traversal-list>li')
  .eq(1)
  .should('contain', 'siamese')
```

- 자주 겪는 에러 와 해결:
  - `expected '<li>' to exist ... index 5` → 존재하지 않는 인덱스 지정 → 집합 길이를 `.should('have.length', n)`으로 먼저 확인하고 범위 내 인덱스 사용. 뒤에서 첫 요소는 `.eq(-1)` 또는 `.last()` 사용.

### .filter

현재 집합 중 선택자(또는 함수)에 일치하는 요소만 남긴다. `.find`(자손 탐색)와 달리 같은 집합 내에서 거른다.

문법: `.filter(selector)`

```js
// .traversal-nav 의 li 중 .active 인 것만 남김
cy.get('.traversal-nav>li')
  .filter('.active')
  .should('contain', 'About')
```

### .find

현재 요소의 자손(자식·손자 등 모든 하위) 중 선택자와 일치하는 요소를 찾는다. `.children`(직계만)보다 넓게 탐색한다.

문법: `.find(selector)`

```js
// pagination 내부의 모든 li 안의 a 태그를 탐색 (체이닝으로 좁혀감)
cy.get('.traversal-pagination')
  .find('li')
  .find('a')
  .should('have.length', 7)   // a 가 7개인지 확인
```

- 자주 겪는 에러 와 해결:
  - `.find()` 결과가 0개라 타임아웃 → 선택자 오타 또는 요소가 자손이 아니라 형제일 때 발생 → `.children`/`.siblings`로 방향을 바꾸거나 선택자 재확인.

### .first

집합의 첫 번째 요소만 선택한다(`.eq(0)`과 동일).

문법: `.first()`

```js
// table 의 td 중 첫 번째 셀
cy.get('.traversal-table td')
  .first()
  .should('contain', '1')
```

### .last

집합의 마지막 요소만 선택한다(`.eq(-1)`과 동일).

문법: `.last()`

```js
// 버튼 그룹의 마지막 버튼
cy.get('.traversal-buttons .btn')
  .last()
  .should('contain', 'Submit')
```

### .next

바로 다음 형제 요소 하나를 가져온다.

문법: `.next()` / `.next(selector)`

```js
// 'apples' 텍스트를 가진 항목의 바로 다음 형제
cy.get('.traversal-ul')
  .contains('apples')
  .next()
  .should('contain', 'oranges')
```

### .nextAll

현재 요소 뒤의 모든 형제 요소를 가져온다.

문법: `.nextAll()` / `.nextAll(selector)`

```js
// 'oranges' 뒤에 오는 모든 형제 (3개)
cy.get('.traversal-next-all')
  .contains('oranges')
  .nextAll()
  .should('have.length', 3)
```

### .nextUntil

현재 요소 다음 형제부터 시작해 선택자에 일치하는 요소를 만나기 전까지의 형제들을 가져온다(경계 요소 자체는 제외).

문법: `.nextUntil(selector)`

```js
// #veggies 다음 형제부터 #nuts 직전까지 (3개)
cy.get('#veggies')
  .nextUntil('#nuts')
  .should('have.length', 3)
```

### .not

현재 집합에서 선택자에 일치하는 요소를 제외한다. `.filter`의 반대.

문법: `.not(selector)`

```js
// 버튼들 중 [disabled] 속성이 없는 것만 남김
cy.get('.traversal-disabled .btn')
  .not('[disabled]')
  .should('not.contain', 'Disabled')
```

### .parent

직계 부모 요소 하나를 가져온다.

문법: `.parent()` / `.parent(selector)`

```js
// .traversal-mark 의 직계 부모
cy.get('.traversal-mark')
  .parent()
  .should('contain', 'Morbi leo risus')
```

### .parents

모든 조상 요소(부모, 조부모 ... 최상위)를 가져온다. 선택자를 주면 일치하는 조상만.

문법: `.parents()` / `.parents(selector)`

```js
// .traversal-cite 의 모든 조상 집합
cy.get('.traversal-cite')
  .parents()
  .should('match', 'blockquote')  // 집합 중 blockquote 와 일치
```

- 자주 겪는 에러 와 해결:
  - `.should('match', ...)`가 "1개 요소만 가능"이라며 실패 → 조상이 여러 개라 집합 크기가 1이 아님 → `.parents(selector)`로 좁히거나 가장 가까운 하나가 필요하면 `.closest()` 사용.

### .parentsUntil

현재 요소부터 위로 올라가며 선택자에 일치하는 조상 직전까지의 조상들을 가져온다(경계 자체 제외).

문법: `.parentsUntil(selector)`

```js
// .active 에서 .clothes-nav 직전까지의 조상 (2개)
cy.get('.clothes-nav')
  .find('.active')
  .parentsUntil('.clothes-nav')
  .should('have.length', 2)
```

### .prev

바로 이전 형제 요소 하나를 가져온다(`.next`의 반대).

문법: `.prev()` / `.prev(selector)`

```js
// .active 의 바로 이전 형제
cy.get('.birds')
  .find('.active')
  .prev()
  .should('contain', 'Lorikeets')
```

### .prevAll

현재 요소 앞의 모든 형제 요소를 가져온다.

문법: `.prevAll()` / `.prevAll(selector)`

```js
// .third 앞에 오는 모든 형제 (2개)
cy.get('.fruits-list')
  .find('.third')
  .prevAll()
  .should('have.length', 2)
```

### .prevUntil

현재 요소 이전 형제부터 선택자에 일치하는 요소 직전까지의 형제들을 가져온다(경계 제외).

문법: `.prevUntil(selector)`

```js
// #nuts 이전 형제부터 #veggies 직후까지 (3개)
cy.get('.foods-list')
  .find('#nuts')
  .prevUntil('#veggies')
  .should('have.length', 3)
```

### .siblings

자기 자신을 제외한 모든 형제 요소를 가져온다.

문법: `.siblings()` / `.siblings(selector)`

```js
// 활성 pill 을 제외한 형제 pill 들 (2개)
cy.get('.traversal-pills .active')
  .siblings()
  .should('have.length', 2)
```

탐색 명령은 모두 `cy.server`/`cy.route` 같은 네트워크 API와 무관한 순수 DOM 명령이므로 deprecated 이슈가 없다. 다만 탐색 결과가 비면 Cypress가 기본 타임아웃(`defaultCommandTimeout`)까지 재시도하다 실패하므로, 방향(자손/형제/조상)을 잘못 잡지 않았는지부터 점검한다.

> 💡 실무 팁: 한 번에 `cy.get('a > b > c')`로 깊게 선택하기보다 `.find().filter().eq()`처럼 짧게 끊어 체이닝하면 실패 시 어느 단계에서 집합이 비었는지 Command Log에서 바로 보여 디버깅이 훨씬 빠르다.

---

<a id="actions"></a>

## 3. Actions — 사용자 동작

이 카테고리는 타이핑, 포커스, 클릭, 체크, 드롭다운 선택, 스크롤, 이벤트 트리거, 파일 첨부 등 **실제 사용자가 페이지에서 일으키는 동작**을 Cypress 명령으로 재현하는 방법을 시연한다. 모든 액션 명령은 대상 요소가 "actionable(동작 가능)" 상태(보이고, 가려지지 않고, 비활성화 아님, 애니메이션 멈춤)가 될 때까지 자동으로 재시도한 뒤 실행되며, 이 검사를 건너뛰려면 `{ force: true }`를 쓴다.

#### 액션 명령 한눈에 보기

| 명령 | 용도 | force 지원 |
|------|------|:---:|
| `.type` | 키보드 입력 | O |
| `.focus` / `.blur` | 포커스 획득 / 해제 | - |
| `.clear` | 입력값 비우기 | O |
| `.submit` | 폼 제출 | - |
| `.click` / `.dblclick` / `.rightclick` | 클릭 / 더블클릭 / 우클릭 | O |
| `.check` / `.uncheck` | 체크박스·라디오 선택 / 해제 | O |
| `.select` | `<select>` 드롭다운 선택 | - |
| `.scrollIntoView` / `cy.scrollTo` | 요소까지 / 좌표까지 스크롤 | - |
| `.trigger` | 임의 DOM 이벤트 발생 | O |
| `.selectFile` | 파일 input에 파일 첨부 | O |

### .type

키보드로 텍스트와 특수키를 입력한다. 입력 필드(`input`, `textarea`, `contenteditable`)에만 동작한다.

`.type(text, options)`

```js
cy.get('.action-email').type('[email protected]')          // 일반 텍스트 입력
cy.get('.action-email').type('{leftarrow}{rightarrow}{uparrow}{downarrow}') // 방향키
cy.get('.action-email').type('{del}{selectall}{backspace}')   // 삭제·전체선택·백스페이스
cy.get('.action-email').type('{ctrl}{alt}{shift}{meta}')      // 수정자 키(누른 상태 유지)
cy.get('.action-email').type('[email protected]', { delay: 100 }) // 키 입력 간 100ms 지연
cy.get('.action-disabled').type('disabled error checking', { force: true }) // 비활성 필드 강제 입력
```

- **`cy.type() failed because this element is not visible/disabled` → 원인:** 필드가 `disabled`이거나 다른 요소에 가려짐 → **해결:** 실제 비활성 검증이 목적이 아니면 `{ force: true }`, 가림이면 먼저 스크롤·모달 닫기.
- **특수키가 글자 그대로 입력됨 → 원인:** 중괄호 누락(`enter` vs `{enter}`) → **해결:** 특수키는 반드시 `{enter}`, `{esc}` 형태로. 리터럴 `{`는 `{{}`로 이스케이프.

### .focus

요소에 포커스를 준다. 포커스 가능한 요소(`input`, `button`, `a` 등)에만 동작한다.

`.focus(options)`

```js
cy.get('.action-focus').focus()                        // 포커스 부여
cy.get('.action-focus')
  .should('have.class', 'focus')                       // 포커스 시 추가되는 클래스 검증
  .prev().should('have.attr', 'style', 'color: orange;') // 인접 라벨 스타일 변화 확인
```

- **`cannot focus a non-focusable element` → 원인:** `div`/`span` 등 기본 포커스 불가 요소 → **해결:** 대상에 `tabindex`가 있는지 확인하거나, 실제 포커스 가능한 요소를 선택.

### .blur

현재 포커스된 요소에서 포커스를 해제(`blur`)한다. 직전에 포커스 상태여야 한다.

`.blur(options)`

```js
cy.get('.action-blur').type('About to blur') // 입력하면서 자동 포커스
cy.get('.action-blur').blur()                // 포커스 해제 → blur 이벤트 발생
cy.get('.action-blur')
  .should('have.class', 'error')             // 유효성 에러 클래스 부여 확인
  .prev().should('have.attr', 'style', 'color: red;')
```

- **`cannot blur ... currently does not have focus` → 원인:** 포커스되지 않은 요소에 `.blur()` 호출 → **해결:** 직전에 `.focus()`나 `.type()`으로 포커스 부여, 또는 `{ force: true }`.

### .clear

input/textarea의 값을 비운다. 내부적으로 `{selectall}{del}`을 수행하는 단축 명령이다.

`.clear(options)`

```js
cy.get('.action-clear').type('Clear this text')
cy.get('.action-clear').should('have.value', 'Clear this text')
cy.get('.action-clear').clear()                  // 값 비우기
cy.get('.action-clear').should('have.value', '') // 빈 값 확인
```

- **`.clear()` 가 효과 없음 → 원인:** `contenteditable` div 등 일반 input이 아님 → **해결:** `.type('{selectall}{del}')` 또는 `.invoke('text', '')` 사용.

### .submit

폼(`<form>`)을 제출한다. 반드시 `form` 요소(또는 폼 1개를 포함한 집합)에 호출해야 한다.

`.submit(options)`

```js
cy.get('.action-form').find('[type="text"]').type('HALFOFF') // 폼 내부 입력
cy.get('.action-form').submit()                               // 폼 제출
cy.get('.action-form').next().should('contain', 'Your form has been submitted!')
```

- **`can only be called on a <form>` → 원인:** 버튼이나 input에 `.submit()` 호출 → **해결:** `form`을 선택하거나, 제출 버튼을 `.click()`.

### .click

요소를 클릭한다. 위치 키워드(`'topLeft'` 등 9방향)나 좌표 `(x, y)`로 클릭 지점 지정이 가능하다.

`.click(position?, x?, y?, options?)`

```js
cy.get('.action-btn').click()                       // 기본(중앙) 클릭
cy.get('#action-canvas').click('topRight')          // 9방향 위치 키워드
cy.get('#action-canvas').click(80, 75)              // 요소 기준 상대 좌표 클릭
cy.get('.action-labels>.label').click({ multiple: true }) // 매칭된 여러 요소 순차 클릭
cy.get('.action-opacity>.btn').click({ force: true })     // 가려진/투명 요소 강제 클릭
```

- **`element is being covered by another element` → 원인:** 오버레이·고정 헤더가 클릭 지점을 가림 → **해결:** 가린 요소를 닫거나 스크롤, 불가피하면 `{ force: true }`.
- **`cy.click() can only be called on a single element` → 원인:** 셀렉터가 여러 요소 매칭 → **해결:** 셀렉터를 좁히거나 `.first()`/`.eq()`, 모두 클릭이 의도면 `{ multiple: true }`.

### .dblclick

요소를 더블클릭한다. `dblclick` 이벤트가 필요한 UI(인라인 편집 등) 검증에 쓴다.

`.dblclick(position?, x?, y?, options?)`

```js
cy.get('.action-div').dblclick()                         // 더블클릭 → 편집 모드 전환
cy.get('.action-div').should('not.be.visible')           // 원래 div 숨김
cy.get('.action-input-hidden').should('be.visible')      // 입력 필드 노출
```

### .rightclick

요소를 우클릭(`contextmenu` 이벤트)한다. 커스텀 컨텍스트 메뉴 검증에 쓴다.

`.rightclick(position?, x?, y?, options?)`

```js
cy.get('.rightclick-action-div').rightclick()                  // 우클릭 → 커스텀 메뉴
cy.get('.rightclick-action-div').should('not.be.visible')
cy.get('.rightclick-action-input-hidden').should('be.visible')
```

- **브라우저 기본 메뉴가 뜸 → 원인:** 앱이 `contextmenu` 기본동작을 막지 않음 → **해결:** 이는 정상; Cypress는 이벤트만 발생시키므로 앱의 `preventDefault` 구현을 확인.

### .check

체크박스 또는 라디오 버튼을 선택한다. `value`로 특정 항목을, 배열로 여러 항목을 한 번에 선택한다.

`.check(value?, options?)`

```js
cy.get('.action-checkboxes [type="checkbox"]').not('[disabled]').check() // 활성 체크박스 모두 체크
cy.get('.action-radios [type="radio"]').check('radio1')                  // value로 특정 라디오 선택
cy.get('.action-multiple-checkboxes [type="checkbox"]').check(['checkbox1', 'checkbox2']) // 여러 값 선택
cy.get('.action-checkboxes [disabled]').check({ force: true })           // 비활성 체크박스 강제 체크
```

- **`can only be called on :checkbox and :radio` → 원인:** 일반 요소에 호출 → **해결:** `[type="checkbox"]`/`[type="radio"]`만 선택.
- **`disabled` 항목 체크 실패 → 원인:** 비활성 요소는 기본적으로 동작 불가 → **해결:** 의도된 검증이면 `{ force: true }`.

### .uncheck

체크된 체크박스를 해제한다. (라디오는 해제 개념이 없어 체크박스에만 사용)

`.uncheck(value?, options?)`

```js
cy.get('.action-check [type="checkbox"]').not('[disabled]').uncheck() // 활성 체크박스 모두 해제
cy.get('.action-check [type="checkbox"]').check('checkbox1')          // 먼저 체크
cy.get('.action-check [type="checkbox"]').uncheck('checkbox1')        // value로 특정 항목 해제
cy.get('.action-check [type="checkbox"]').uncheck(['checkbox1', 'checkbox3']) // 여러 값 해제
cy.get('.action-check [disabled]').uncheck({ force: true })           // 비활성 강제 해제
```

### .select

`<select>` 드롭다운에서 옵션을 선택한다. 표시 텍스트 또는 `value` 속성으로, 멀티셀렉트는 배열로 선택한다.

`.select(valueOrText, options?)`

```js
cy.get('.action-select').select('apples')                 // 표시 텍스트로 선택
cy.get('.action-select').should('have.value', 'fr-apples') // 실제 value 확인
cy.get('.action-select').select('fr-bananas')             // value 속성으로 선택
cy.get('.action-select-multiple').select(['apples', 'oranges', 'bananas']) // 다중 선택
cy.get('.action-select-multiple').invoke('val')
  .should('deep.equal', ['fr-apples', 'fr-oranges', 'fr-bananas'])
```

- **`.select() matched more than one option` → 원인:** 동일 텍스트 옵션 중복 → **해결:** 고유한 `value`로 선택.
- **커스텀 드롭다운(div 기반)에 안 됨 → 원인:** 네이티브 `<select>`가 아님 → **해결:** `.click()`으로 펼치고 항목을 `.click()`.

### .scrollIntoView

특정 요소가 화면에 보이도록 컨테이너를 스크롤한다.

`.scrollIntoView(options?)`

```js
cy.get('#scroll-horizontal button').should('not.be.visible') // 처음엔 화면 밖
cy.get('#scroll-horizontal button').scrollIntoView()         // 요소까지 스크롤
cy.get('#scroll-horizontal button').should('be.visible')     // 이제 보임
```

> 참고: 대부분의 액션 명령(`.click`, `.type` 등)은 실행 전 자동으로 요소까지 스크롤하므로, `.scrollIntoView`는 스크롤 동작 자체를 검증하거나 가시성 단언이 필요할 때만 명시적으로 쓴다.

### cy.scrollTo

윈도우 또는 특정 컨테이너를 지정한 위치/좌표로 스크롤한다. (요소가 아닌 "위치"가 대상)

`cy.scrollTo(position | x, y, options?)` · `.scrollTo(...)`(컨테이너 대상)

```js
cy.scrollTo('bottom')                                   // 윈도우 맨 아래로
cy.get('#scrollable-horizontal').scrollTo('right')      // 컨테이너 오른쪽 끝으로
cy.get('#scrollable-vertical').scrollTo(250, 250)       // 절대 좌표로
cy.get('#scrollable-both').scrollTo('75%', '25%')       // 퍼센트로
cy.get('#scrollable-both').scrollTo('center', { duration: 2000 }) // 2초 애니메이션
```

- **`cy.scrollTo() must be called on a valid scrollable element` → 원인:** 대상에 스크롤 영역이 없음 → **해결:** `overflow:auto/scroll`인 실제 스크롤 컨테이너를 선택.

### .trigger

요소에 임의의 DOM 이벤트를 직접 발생시킨다. `.click` 등 전용 명령이 없는 이벤트(`mousedown`, `change`, range `input` 등)에 쓴다.

`.trigger(eventName, position?, x?, y?, options?)`

```js
cy.get('.trigger-input-range').invoke('val', 25) // 값을 먼저 설정
cy.get('.trigger-input-range').trigger('change') // change 이벤트 강제 발생
cy.get('.trigger-input-range').get('input[type=range]')
  .siblings('p').should('have.text', '25')        // 핸들러 반영 확인
```

- **이벤트가 핸들러에 안 잡힘 → 원인:** 좌표·버튼 등 이벤트 속성 누락 → **해결:** `.trigger('mousedown', { which: 1, pageX: 100 })`처럼 필요한 속성을 옵션으로 전달.

### .selectFile

파일 input(`<input type="file">`)이나 드롭존에 파일을 첨부한다. (Cypress 9.3+ 도입, 구버전의 `cypress-file-upload` 플러그인 대체)

`.selectFile(file | fileArray, options?)`

```js
cy.get('input[type=file]').selectFile('cypress/fixtures/photo.png') // fixture 파일 첨부
cy.get('input[type=file]').selectFile([                              // 여러 파일 첨부
  'cypress/fixtures/a.json',
  'cypress/fixtures/b.json',
])
cy.get('input[type=file]').selectFile({                              // 내용·이름 직접 지정
  contents: Cypress.Buffer.from('file contents'),
  fileName: 'note.txt',
  mimeType: 'text/plain',
})
cy.get('.drop-zone').selectFile('cypress/fixtures/photo.png', { action: 'drag-drop' }) // 드래그앤드롭
cy.get('input[type=file]').selectFile('cypress/fixtures/photo.png', { force: true })   // 숨겨진 input 강제
```

- **`must be called on an <input type="file">` → 원인:** 보이는 커스텀 버튼/라벨에 호출 → **해결:** 실제 숨겨진 file input을 선택하고 `{ force: true }`(숨김이라 동작 불가하므로).
- **파일을 못 찾음 → 원인:** 경로 기준 오류 → **해결:** 경로는 프로젝트 루트 기준. fixture는 `cypress/fixtures/...` 전체 경로로 지정.

> 💡 실무 팁: `{ force: true }`는 "actionability 검사를 건너뛰는" 강력한 우회책이라 가림·비활성 같은 실제 UI 버그를 숨길 수 있으니, 디자인상 숨겨진 file input이나 의도적으로 검증하는 경우에만 쓰고 평소엔 가린 요소를 먼저 처리하는 게 안전하다. 또한 `.scrollIntoView`/`cy.scrollTo`를 혼동하지 말 것 — 전자는 "요소"를, 후자는 "위치"를 대상으로 한다.

---

<a id="window"></a>

## 4. Window — 윈도우/문서

이 카테고리는 테스트 중인 애플리케이션의 브라우저 전역 객체(`window`), 문서 객체(`document`), 그리고 문서 제목(`title`)에 접근해 속성을 검증하는 명령들을 시연한다. 모두 AUT(Application Under Test) 자체의 객체를 가져오는 쿼리 명령이며, 뒤에 `.should()`/`.then()`을 체이닝해 검증하거나 값을 활용한다.

### cy.window

테스트 중인 페이지의 `window` 전역 객체를 가져온다. 앱 내부의 전역 변수나 상태(예: `window.store`, `window.app`)를 직접 들여다볼 때 유용하다.

문법: `cy.window(options?)` — yields: `window` 객체

```js
// 1) window 객체에 top 속성이 있는지 검증 (example.cypress.io 예제)
cy.window().should('have.property', 'top')

// 2) 앱이 window 에 노출한 전역 상태를 .then() 으로 꺼내 활용
cy.window().then((win) => {
  // win 은 일반 JS 객체이므로 자유롭게 접근 가능
  expect(win.localStorage.getItem('token')).to.not.be.null
  win.localStorage.setItem('lang', 'ko') // 테스트 셋업용으로 값 주입도 가능
})

// 3) 앱 내부 상태(예: Redux store) 단언
cy.window()
  .its('store') // window.store 로 더 짧게 접근
  .invoke('getState')
  .should('have.property', 'user')
```

자주 겪는 에러 와 해결:
- `Cannot read properties of undefined (reading 'store')` → 앱이 아직 `window.store`를 노출하기 전에 접근함 → `cy.its('store')`로 바꾸면 재시도(retry)가 적용되어 노출될 때까지 기다린다. 또는 해당 셋업 코드 뒤에서 호출한다.
- 콘솔에는 값이 보이는데 단언이 실패 → `cy.window()`는 비동기라 변수에 담아 동기적으로 못 쓴다 → 반드시 `.then()`/`.should()` 안에서 사용한다.

### cy.document

테스트 중인 페이지의 `document` 객체를 가져온다. 문서 메타데이터(charset, title, cookie 등)나 DOM 루트를 확인할 때 쓴다.

문법: `cy.document(options?)` — yields: `document` 객체

```js
// 1) document 의 charset 속성이 'UTF-8' 인지 검증 (example.cypress.io 예제)
cy.document().should('have.property', 'charset').and('eq', 'UTF-8')

// 2) document 객체를 꺼내 직접 검사
cy.document().then((doc) => {
  // readyState 가 complete 인지 등 문서 상태 확인
  expect(doc.readyState).to.equal('complete')
})

// 3) .its() 로 특정 속성만 짧게 단언
cy.document().its('contentType').should('eq', 'text/html')
```

| 자주 쓰는 document 속성 | 검증 예시 |
|---|---|
| `charset` | `.should('have.property','charset').and('eq','UTF-8')` |
| `contentType` | `.its('contentType').should('eq','text/html')` |
| `readyState` | `.its('readyState').should('eq','complete')` |

자주 겪는 에러 와 해결:
- `expected ... to equal 'UTF-8'` 처럼 대소문자 불일치 → 브라우저/문서에 따라 `utf-8` 소문자로 올 수 있음 → 단언 전 `.invoke('toUpperCase')`로 정규화하거나 정확한 케이스를 확인한다.

### cy.title

`<head>`의 `<title>` 태그 텍스트, 즉 `document.title` 값을 가져온다. 페이지 전환·라우팅 후 제목이 올바른지 검증하는 데 자주 쓴다.

문법: `cy.title(options?)` — yields: 문자열(title)

```js
// 1) 제목에 'Kitchen Sink' 가 포함되는지 검증 (example.cypress.io 예제)
cy.title().should('include', 'Kitchen Sink')

// 2) 정확히 일치 검증
cy.title().should('eq', 'Cypress.io: Kitchen Sink')

// 3) 라우팅 후 제목이 바뀌는지 확인
cy.get('[data-cy="dashboard-link"]').click()
cy.title().should('include', 'Dashboard') // SPA 라면 retry 로 변경될 때까지 대기
```

자주 겪는 에러 와 해결:
- `expected '' to include 'Kitchen Sink'` → SPA에서 라우팅 후 `document.title`이 비동기로 갱신되어 아직 비어있음 → `cy.title()`은 자동 재시도되므로 보통 `.should()` 단언으로 해결된다. 그래도 안 되면 제목 변경을 트리거하는 클릭/네비게이션이 먼저 끝났는지 확인한다.
- 탭에 보이는 제목과 다름 → `<title>`이 아니라 다른 메타로 표시되는 경우 → `cy.title()`은 `document.title`만 본다. 메타 태그는 `cy.get('meta[property="og:title"]').should('have.attr','content', ...)`로 따로 검증한다.

> 💡 실무 팁: `cy.window().its('...')`/`cy.document().its('...')` 형태를 쓰면 Cypress의 자동 재시도가 적용되어 앱이 전역 값을 늦게 노출해도 안정적으로 통과한다. 참고로 과거의 `cy.server()`/`cy.route()`(네트워크 스텁)는 deprecated 이므로 네트워크 가로채기는 `cy.intercept()`를 사용한다.

---

<a id="viewport"></a>

## 5. Viewport — 화면 크기

이 카테고리는 테스트가 실행되는 동안 브라우저의 화면(뷰포트) 크기를 동적으로 바꾸는 방법을 시연한다. 픽셀 단위 지정, 미리 정의된 디바이스 프리셋, 가로/세로 방향(orientation) 전환을 다룬다. 반응형 레이아웃이나 모바일/데스크톱 분기 UI를 검증할 때 핵심이 되는 명령이다.

### cy.viewport()

현재 테스트의 브라우저 뷰포트 너비·높이를 픽셀 또는 디바이스 프리셋으로 변경한다.

문법: `cy.viewport(width, height, options?)` 또는 `cy.viewport(preset, orientation?, options?)`

```js
// 1) 픽셀 단위로 직접 지정 (width, height)
cy.viewport(320, 480)        // 작은 모바일 크기
cy.get('#navbar').should('not.be.visible')   // 좁은 화면에서 숨겨지는지 확인

cy.viewport(2999, 2999)      // 매우 큰 화면 (최대 한계 확인용)

// 2) 디바이스 프리셋 이름으로 지정
cy.viewport('macbook-15')    // 1440 x 900
cy.viewport('ipad-2')        // 768 x 1024
cy.viewport('iphone-6')      // 375 x 667

// 3) 프리셋 + 방향(orientation) 조합
cy.viewport('ipad-2', 'portrait')    // 세로 (기본값) → 768 x 1024
cy.viewport('iphone-4', 'landscape') // 가로 → width/height가 뒤바뀜
```

핵심 동작:
- 기본 orientation은 `'portrait'`(세로)이며, `'landscape'`를 주면 width와 height가 서로 교환된다.
- 뷰포트는 **각 테스트(it) 사이에 기본 크기로 자동 리셋**된다. 기본값은 `cypress.config.js`의 `viewportWidth`/`viewportHeight`(기본 1000 x 660)이다.
- 한 테스트 안에서 여러 번 호출하면 호출 시점마다 즉시 크기가 바뀐다.

주요 디바이스 프리셋:

| 프리셋 | 크기(portrait, px) | 비고 |
|---|---|---|
| `macbook-16` | 1536 x 960 | |
| `macbook-15` | 1440 x 900 | |
| `macbook-13` | 1280 x 800 | |
| `macbook-11` | 1366 x 768 | |
| `ipad-2` | 768 x 1024 | |
| `ipad-mini` | 768 x 1024 | |
| `iphone-x` | 375 x 812 | |
| `iphone-6+` | 414 x 736 | |
| `iphone-6` | 375 x 667 | |
| `iphone-5` | 320 x 568 | |
| `iphone-4` | 320 x 480 | |
| `iphone-3` | 320 x 480 | |
| `samsung-s10` | 360 x 760 | |
| `samsung-note9` | 414 x 846 | |

자주 겪는 에러 와 해결:
- `cy.viewport() can only accept a string preset or a width and height as numbers` → 프리셋 이름 철자가 틀렸거나(예: `iphone6`), width에 문자열을 넣음 → 정확한 프리셋 문자열을 쓰거나, 픽셀은 숫자(`cy.viewport(375, 667)`)로 전달한다.
- `Viewport sizes must be between 0 and 4000 for height/width` → 4000을 초과하는 값 전달 → 0~4000 범위 내 값으로 조정한다(데모의 `2999, 2999`가 사실상 상한 근처).
- 화면을 바꿨는데 레이아웃이 안 변함 → CSS 미디어쿼리가 디바이스 픽셀비(DPR)·UA 기준으로 분기 → 뷰포트만으로 부족하면 `cy.viewport()`와 별개로 미디어쿼리 픽셀 경계에 맞춰 크기를 직접 지정한다.
- 다음 테스트에서 크기가 의도와 다름 → 테스트 사이 자동 리셋 때문 → 매 테스트에서 필요한 크기를 다시 호출하거나, `beforeEach`에서 `cy.viewport(...)`로 고정한다.

참고(deprecated): 뷰포트와 직접 관련은 없지만, 같은 Kitchen Sink의 네트워크 제어에서 쓰이던 `cy.server()`/`cy.route()`는 더 이상 권장되지 않으며 `cy.intercept()`로 대체되었다.

> 💡 실무 팁: 반응형 분기를 검증할 땐 `Cypress._.each(['iphone-6', 'ipad-2', 'macbook-15'], (d) => { cy.viewport(d); /* assertion */ })`처럼 프리셋을 반복 순회하면 모바일·태블릿·데스크톱을 한 테스트로 커버할 수 있다. 단, 테스트 사이 자동 리셋을 신뢰하지 말고 필요한 크기는 항상 명시적으로 다시 지정하라.

---

<a id="location"></a>

## 6. Location — URL/위치

이 카테고리는 현재 페이지의 URL과 그 구성요소(해시, 전체 URL, `window.location` 객체)를 조회하고 검증하는 명령들을 시연한다. 페이지 이동 후 라우팅이 의도대로 동작했는지, 쿼리스트링·해시가 올바른지 확인할 때 핵심적으로 쓰인다.

### cy.hash

URL의 해시(`#` 이후 부분)를 가져온다. 해시가 없으면 빈 문자열을 반환한다.

문법: `cy.hash(options?)`

```js
// 해시(#...)가 없으면 빈 문자열이므로 be.empty 로 검증
cy.hash().should('be.empty')

// SPA 라우터(예: 해시 라우팅)에서 특정 해시로 이동했는지 확인
// cy.visit('/commands/location#hash-value')
// cy.hash().should('eq', '#hash-value')  // 반드시 '#' 포함
```

자주 겪는 에러 와 해결:
- `expected '' to equal '#section'` → 해시 검증 시 `#`를 빼먹음 → 기댓값에 `#`를 포함한다(`cy.hash()`는 `#`를 붙여서 반환).
- 해시가 항상 비어 있음 → SPA 라우팅 전환을 기다리지 않고 즉시 단언 → `cy.url().should('include', ...)` 등으로 라우팅 완료를 먼저 기다린 뒤 해시를 확인한다(Cypress 재시도가 자동 적용되므로 보통 `should`만으로 해결).

### cy.location

`window.location`을 Cypress가 다루기 쉬운 객체로 래핑해 반환한다. 특정 속성 하나만 뽑아 검증할 수도 있다.

문법: `cy.location(key?, options?)`

```js
// 콜백으로 location 객체 전체를 받아 각 속성을 개별 검증
cy.location().should((location) => {
  expect(location.hash).to.be.empty
  expect(location.href).to.eq('https://example.cypress.io/commands/location')
  expect(location.host).to.eq('example.cypress.io')      // hostname + port
  expect(location.hostname).to.eq('example.cypress.io')  // 도메인만
  expect(location.origin).to.eq('https://example.cypress.io')
  expect(location.pathname).to.eq('/commands/location')
  expect(location.port).to.eq('')        // 기본 포트면 빈 문자열
  expect(location.protocol).to.eq('https:')  // 콜론(:) 포함
  expect(location.search).to.be.empty    // 쿼리스트링(?...)
})

// 속성 하나만 꺼내서 바로 검증 (key 인자 사용)
cy.location('pathname').should('eq', '/commands/location')
```

주요 속성 표:

| 속성 | 의미 | 예시 값 |
|------|------|---------|
| `href` | 전체 URL | `https://example.cypress.io/commands/location` |
| `origin` | 프로토콜+호스트 | `https://example.cypress.io` |
| `host` | 호스트명+포트 | `example.cypress.io` |
| `hostname` | 호스트명만 | `example.cypress.io` |
| `port` | 포트 (기본이면 빈 문자열) | `''` |
| `protocol` | 프로토콜 (콜론 포함) | `https:` |
| `pathname` | 경로 | `/commands/location` |
| `search` | 쿼리스트링 (`?` 포함) | `?id=1` |
| `hash` | 해시 (`#` 포함) | `#section` |

자주 겪는 에러 와 해결:
- `expected 'https:' to equal 'https'` → `protocol`은 콜론(`:`)을 포함함 → 기댓값을 `'https:'`로 작성한다.
- `cy.location()` vs `window.location` 혼동 → `window.location`을 직접 쓰면 Cypress 재시도/대기가 적용되지 않아 flaky → 항상 `cy.location()`을 사용한다.
- 단일 속성만 검증하고 싶을 때 콜백 안에서 expect 남발 → `cy.location('pathname').should('eq', ...)` 형태로 key 인자를 쓰면 재시도가 더 깔끔하게 동작한다.

### cy.url

현재 URL 문자열을 반환한다. 내부적으로 `cy.location('href')`와 동일하다.

문법: `cy.url(options?)`

```js
// 전체 URL 문자열을 그대로 비교
cy.url().should('eq', 'https://example.cypress.io/commands/location')

// 일부만 포함 검증 (도메인이 환경마다 다를 때 유용)
cy.url().should('include', '/commands/location')

// 정규식 매칭
cy.url().should('match', /\/commands\/location$/)
```

자주 겪는 에러 와 해결:
- `eq` 비교가 환경(staging/prod)마다 실패 → 베이스 URL이 달라짐 → 절대 URL `eq` 대신 `should('include', '/path')` 또는 `match` 정규식을 사용한다.
- 페이지 이동 직후 이전 URL로 단언 실패 → `cy.click()` 후 라우팅이 끝나기 전에 검증 → `cy.url().should('include', ...)`로 작성하면 Cypress가 자동 재시도하므로 임의 `cy.wait(ms)`는 넣지 않는다.

> 💡 실무 팁: 환경별로 도메인이 바뀌는 자동화에서는 `cy.url().should('eq', ...)`처럼 전체 URL을 고정하지 말고 `should('include', '/경로')`나 `cy.location('pathname')`으로 경로만 검증해 테스트를 환경 독립적으로 유지하라. 참고로 네트워크 가로채기에 쓰던 `cy.server`/`cy.route`는 deprecated 이므로 `cy.intercept`를 사용한다(Location 명령 자체는 deprecated 아님).

---

<a id="navigation"></a>

## 7. Navigation — 페이지 이동

이 카테고리는 브라우저의 뒤로/앞으로 이동, 페이지 새로고침, 특정 URL 방문 등 "페이지 이동(navigation)" 동작을 Cypress로 제어하는 방법을 시연한다. 테스트 도중 사용자처럼 화면을 옮겨 다니거나 상태를 초기화할 때 사용한다.

| 명령 | 역할 | 비유 |
| --- | --- | --- |
| `cy.go` | 브라우저 히스토리 앞/뒤 이동 | 브라우저의 ←, → 버튼 |
| `cy.reload` | 현재 페이지 새로고침 | F5 / 새로고침 버튼 |
| `cy.visit` | 지정한 URL로 이동 | 주소창에 URL 입력 후 이동 |

### cy.go

브라우저 히스토리를 앞이나 뒤로 이동시킨다. 사용자가 ←/→ 버튼을 누르는 것과 같다.

문법: `cy.go(direction, options)` — `direction`은 `'back'`/`'forward'` 또는 정수(`-1`/`1`).

```js
// 현재 navigation 페이지에 있음을 확인
cy.location('pathname').should('include', 'navigation')

// 뒤로 이동 → 이전 페이지로
cy.go('back')
cy.location('pathname').should('not.include', 'navigation')

// 앞으로 이동 → 다시 navigation 페이지로
cy.go('forward')
cy.location('pathname').should('include', 'navigation')

// 숫자로도 가능: -1 = 뒤로, 1 = 앞으로
cy.go(-1)
cy.location('pathname').should('not.include', 'navigation')

cy.go(1)
cy.location('pathname').should('include', 'navigation')
```

자주 겪는 에러 와 해결
- `cy.go() can only accept 'forward', 'back', or a number...` → 증상: `cy.go('left')`처럼 잘못된 인자 전달 → 해결: 문자열은 `'back'`/`'forward'`만, 숫자는 0이 아닌 정수만 사용한다.
- `cy.go(0) is invalid...` → 원인: `0`은 이동이 없어 의미가 없음 → 해결: 새로고침이 목적이면 `cy.reload()`를 쓴다.
- 이동 후 단언이 실패(이전 DOM을 잡음) → 원인: 페이지 전환 전 요소를 캐시해 둠 → 해결: `cy.go()` 다음 단언은 `cy.location()`/`cy.get()`으로 새로 조회한다.

### cy.reload

현재 페이지를 새로고침한다. 인자로 캐시 무시 여부를 줄 수 있다.

문법: `cy.reload(forceReload, options)` — `forceReload`가 `true`면 캐시를 무시하고 서버에서 다시 받음.

```js
// 일반 새로고침 (캐시 사용)
cy.reload()

// 캐시를 무시하고 강제 새로고침 (Ctrl+Shift+R 와 유사)
cy.reload(true)
```

자주 겪는 에러 와 해결
- `cy.reload() can only accept a boolean or options as its arguments` → 원인: 첫 인자에 boolean이 아닌 값 전달 → 해결: `cy.reload(true)` 또는 `cy.reload({ timeout: 30000 })` 형태로 쓴다.
- 새로고침 후 로그인/상태가 풀림 → 원인: 세션이 메모리에만 있었음 → 해결: `cy.session()`으로 세션을 캐시하거나 쿠키/localStorage를 사전 세팅한다.

### cy.visit

지정한 URL로 페이지를 이동(방문)한다. 대부분의 테스트는 이 명령으로 시작한다.

문법: `cy.visit(url, options)` — `options`로 `timeout`, `onBeforeLoad`, `onLoad`, `method`, `body` 등을 지정.

```js
cy.visit('https://example.cypress.io/commands/navigation', {
  timeout: 50000, // 페이지 load 대기 시간(ms) 상향
  onBeforeLoad: function (contentWindow) {
    // window의 load 이벤트 발생 직전 호출 — 전역 stub 주입 등에 사용
  },
  onLoad: function (contentWindow) {
    // window의 load 이벤트 발생 직후 호출 — 로드 완료 검증 등에 사용
  },
})
```

`baseUrl`을 설정해 두면 경로만 넘겨 간결하게 쓸 수 있다.

```js
// cypress.config.js 에 e2e: { baseUrl: 'https://example.cypress.io' } 설정 시
cy.visit('/commands/navigation') // baseUrl + 경로로 자동 조합
```

자주 겪는 에러 와 해결
- `cy.visit() failed trying to load: ...` (페이지가 응답 안 함) → 원인: 서버 미기동/VPN 미연결/오타 URL → 해결: 서버·네트워크 상태와 URL을 확인하고, 느린 환경이면 `pageLoadTimeout`/`timeout`을 상향한다.
- `cy.visit() failed because it requires a valid HTTP status code` (4xx/5xx) → 원인: 방문 대상이 에러 응답 반환 → 해결: 의도된 에러 페이지라면 `cy.visit(url, { failOnStatusCode: false })`로 통과시킨다.
- `cy.visit() must be called with a url ... cross origin` → 원인: 테스트 도중 다른 도메인으로 이동 → 해결: `cy.origin()` 블록 안에서 교차 출처 작업을 수행한다.

> 💡 실무 팁: 테스트 시작은 `cy.visit('/path')` + `baseUrl` 조합으로 URL을 한 곳에서 관리하고, 네트워크 가로채기가 필요하면 deprecated 된 `cy.server`/`cy.route` 대신 반드시 `cy.intercept`를 사용한다.

---

<a id="assertions"></a>

## 8. Assertions — 검증

이 카테고리는 Cypress가 요소 상태나 값을 검증하는 세 가지 방식 — 암시적 검증(`.should`/`.and`), 명시적 검증(`expect`/`assert`), 콜백 검증(`.should(fn)`) — 을 시연한다. Cypress 검증의 핵심은 **재시도(retry-ability)** 다. `.should`는 통과하거나 타임아웃될 때까지 직전 명령을 자동으로 재실행하므로, 대부분의 경우 별도 wait 없이도 안정적으로 동작한다.

### 암시적 검증 — .should / .and

직전에 yield된 subject에 대해 자동 재시도하며 검증하는 가장 권장되는 방식이다. `.and`는 같은 subject에 검증을 이어 붙이는 `.should`의 별칭이다.

문법: `.should(chainer[, value][, value])` / `.and(chainer[, value][, value])`

```javascript
// 테이블의 마지막 행과 그 안의 첫 td를 여러 chainer로 연쇄 검증
cy.get('.assertion-table')
  .find('tbody tr:last')
  .should('have.class', 'success') // 클래스 보유 여부
  .find('td')
  .first()
  .should('have.text', 'Column content') // 텍스트 정확히 일치
  .should('contain', 'Column content') // 부분 포함
  .should('have.html', 'Column content') // 내부 HTML
  .should('match', 'td') // CSS 셀렉터로 매칭
  .invoke('text') // subject를 텍스트 문자열로 변경
  .should('match', /column content/i) // 정규식 매칭 (대소문자 무시)

// .and 로 검증을 연쇄 — href 속성이 존재하고 cypress.io 를 포함하는지
cy.get('.assertions-link')
  .should('have.class', 'active')
  .and('have.attr', 'href') // 속성 보유 + 그 값을 다음 subject로 yield
  .and('include', 'cypress.io') // yield된 href 문자열에 대해 검증
```

자주 겪는 에러 와 해결
- `Timed out retrying: expected '<td>' to have text 'X'` → 실제 텍스트에 공백·줄바꿈이 섞여 있는데 `have.text`로 완전 일치를 요구함 → 부분 일치면 `contain`을, 공백 정규화가 필요하면 `.invoke('text').should('match', /.../)` 또는 콜백 검증을 사용한다.
- `.and('include', ...)` 가 엉뚱한 값을 검증 → `.and('have.attr','href')` 가 subject를 href 문자열로 바꾼 점을 놓침 → chainer가 값을 yield하면 다음 검증 대상이 바뀐다는 점을 기억한다.

### 명시적 검증 — expect / assert

특정 변수·계산 결과 등 DOM이 아닌 값을 그 자리에서 단언할 때 사용한다. 재시도되지 않으므로 주로 `.should(fn)`/`.then` 콜백 내부에서 쓴다. `expect`는 BDD 스타일, `assert`는 TDD 스타일이다.

문법: `expect(actual).to.<chainer>(...)` / `assert.<method>(actual[, message])`

```javascript
// expect — BDD 스타일
expect(true).to.be.true
const o = { foo: 'bar' }
expect(o).to.equal(o) // 동일 참조(===)
expect(o).to.deep.equal({ foo: 'bar' }) // 값 비교(깊은 비교)
expect('FooBar').to.match(/bar$/i) // 정규식

// assert — TDD 스타일
const person = { name: 'Joe', age: 20 }
assert.isObject(person, 'value is object') // 두 번째 인자는 실패 시 메시지
```

자주 겪는 에러 와 해결
- `expect({...}).to.equal({...})` 가 항상 실패 → `equal`은 참조 비교라 서로 다른 객체는 절대 같지 않음 → 값 비교는 `deep.equal`(또는 `eql`)을 쓴다.

### 콜백 검증 — .should(fn)

함수를 넘기면 그 안에서 jQuery subject를 직접 다루며 여러 단언을 조합할 수 있다. **콜백 전체가 통과할 때까지 재시도**되므로 부수효과(저장, 클릭) 코드를 넣으면 안 된다.

문법: `.should(($subject) => { /* expect(...) ... */ })`

```javascript
// 여러 p의 텍스트를 모아 길이와 내용 전체를 한 번에 검증
cy.get('.assertions-p')
  .find('p')
  .should(($p) => {
    // jQuery .map 으로 각 요소 텍스트 추출 후 일반 배열로 변환
    let texts = $p.map((i, el) => Cypress.$(el).text())
    texts = texts.get()
    expect(texts).to.have.length(3)
    expect(texts, 'has expected text in each paragraph').to.deep.eq([
      'Some text from first p',
      'More text from second p',
      'And even more text from third p',
    ])
  })

// 콜백에서 검증 후 .then 으로 통과한 subject를 이어받아 추가 검증
cy.get('.docs-header')
  .find('div')
  .should(($div) => {
    expect($div).to.have.length(1)
    const className = $div[0].className
    expect(className).to.match(/heading-/)
  })
  .then(($div) => {
    expect($div).to.have.text('Introduction')
  })

// expect 대신 throw 로도 검증 가능 (실패 시 throw → 재시도 트리거)
cy.get('.docs-header')
  .find('div')
  .should(($div) => {
    if ($div.length !== 1) {
      throw new Error('Did not find 1 element')
    }
    const className = $div[0].className
    if (!className.match(/heading-/)) {
      throw new Error(`Could not find class "heading-" in ${className}`)
    }
  })

// 공백 정규화 후 두 요소의 텍스트가 같은지 비교
let text
const normalizeText = (s) => s.replace(/\s/g, '').toLowerCase()

cy.get('.two-elements')
  .find('.first')
  .then(($first) => {
    // 부수효과 캡처는 .then 에서 (재시도되지 않음)
    text = normalizeText($first.text())
  })

cy.get('.two-elements')
  .find('.second')
  .should(($div) => {
    const secondText = normalizeText($div.text())
    expect(secondText, 'second text').to.equal(text)
  })

// 숫자 범위 검증 — chainer 조합
cy.get('#random-number').should(($div) => {
  const n = parseFloat($div.text())
  expect(n).to.be.gte(1).and.be.lte(10)
})
```

자주 겪는 에러 와 해결
- 콜백 안에 넣은 클릭·API 호출이 여러 번 실행됨 → `.should(fn)`은 통과까지 재시도되므로 부수효과가 반복됨 → 부수효과는 `.then()`에, 순수 검증만 `.should(fn)`에 둔다.
- `Cypress.$ is not a function` 같은 참조 오류 → 콜백 내부에서 jQuery가 필요할 때 `Cypress.$`를 쓰는데 오타가 있음 → 번들된 jQuery는 `Cypress.$`로 접근한다.

### 자주 쓰는 chainer 표

| chainer | 의미 | 예시 |
|---|---|---|
| `be.visible` | 화면에 보임 | `.should('be.visible')` |
| `exist` / `not.exist` | DOM 존재 / 미존재 | `.should('not.exist')` |
| `have.text` | 텍스트 완전 일치 | `.should('have.text', 'OK')` |
| `contain` / `include.text` | 텍스트 부분 포함 | `.should('contain', 'OK')` |
| `have.value` | input 등의 value 일치 | `.should('have.value', 'abc')` |
| `have.length` | 요소/배열 개수 | `.should('have.length', 3)` |
| `have.class` | 클래스 보유 | `.should('have.class', 'active')` |
| `have.attr` | 속성 보유(값 yield) | `.and('have.attr', 'href')` |
| `have.css` | 계산된 CSS 값 | `.should('have.css', 'color', 'rgb(0,0,0)')` |
| `be.checked` / `be.disabled` | 체크/비활성 상태 | `.should('be.disabled')` |
| `match` | CSS 셀렉터 또는 정규식 매칭 | `.should('match', /content/i)` |

> 💡 실무 팁: 단순 단일 검증은 `.should('chainer', value)` 로 짧게, 여러 단언을 묶거나 텍스트 정규화·연산이 필요하면 `.should(($el) => { expect(...) })` 콜백으로 작성하라. 단, 콜백은 통과까지 재시도되므로 클릭·저장 같은 부수효과는 반드시 `.then()` 안에 두어야 중복 실행을 막을 수 있다.

---

<a id="misc"></a>

## 9. Misc — 기타

이 카테고리는 특정 분류에 묶기 애매한 보조 명령들을 모아, 명령 체인 종료(`cy.end`), 시스템 명령 실행(`cy.exec`), 포커스 요소 조회(`cy.focused`), 임의 객체 래핑(`cy.wrap`), Node 측 작업 위임(`cy.task`)을 시연한다.

| 명령 | 한 줄 요약 | 반환(yield) |
|------|-----------|-------------|
| `cy.end` | 현재 명령 체인을 끊고 subject를 `null`로 만듦 | `null` |
| `cy.exec` | OS의 시스템 명령(셸)을 실행 | `{ code, stdout, stderr }` |
| `cy.focused` | 현재 포커스를 가진 DOM 요소를 가져옴 | 포커스된 element |
| `cy.wrap` | 임의의 값/객체/Promise를 Cypress 체인으로 감쌈 | 래핑한 값 |
| `cy.task` | Node 프로세스(plugin)에서 코드를 실행 | task가 반환한 값 |

### cy.end

체인에 물려 있던 subject를 끊어, 이어지는 명령이 이전 subject를 물려받지 않도록 한다.

문법: `.end()`

```js
cy.get('.misc-table').within(() => {
  // Cheryl 행을 클릭한 뒤 .end()로 체인을 끊음 → 다음 명령은 subject를 물려받지 않음
  cy.contains('Cheryl').click().end()

  // 위와 독립적으로 Charles 행을 새로 찾아 클릭
  cy.contains('Charles').click()
})
```

- 거의 쓸 일이 없다. `cy.get`, `cy.contains` 등은 어차피 매번 새로 DOM을 조회하므로 보통 `.end()` 없이도 동작한다.
- 실무에서는 `.then(() => {})`로 콜백을 끝내면 자연스럽게 체인이 끊기므로 `.end()`보다 이쪽을 더 자주 쓴다.

### cy.exec

테스트가 도는 머신의 셸에서 시스템 명령을 실행한다. DB 시드, 파일 생성, 외부 스크립트 호출 등 사전 준비(setup)에 주로 쓴다.

문법: `cy.exec(command, options)`

```js
// echo의 표준출력(stdout)에 'Jane Lane'이 포함되는지 검증
cy.exec('echo Jane Lane')
  .its('stdout').should('contain', 'Jane Lane')

// 실행 플랫폼/아키텍처 로그 (Windows vs Unix 분기 참고용)
cy.log(`Platform ${Cypress.platform} architecture ${Cypress.arch}`)

// OS에 따라 동등한 명령을 분기 실행 (크로스플랫폼 대응)
if (Cypress.platform === 'win32') {
  cy.exec('print cypress.config.js')
    .its('stderr').should('be.empty') // 표준에러는 비어 있어야 함
} else {
  cy.exec('cat cypress.config.js')
    .its('stderr').should('be.empty')
  cy.exec('pwd')
    .its('exitCode').should('eq', 0) // 종료코드 0 = 정상
}
```

자주 겪는 에러와 해결:
- `the command exited with a non-zero code` → 실행한 명령이 0이 아닌 종료코드 반환(명령 자체 실패) → 명령을 셸에서 직접 실행해 검증하거나, 실패를 허용하려면 `cy.exec('cmd', { failOnNonZeroExit: false })`.
- `cy.exec() timed out after 60000ms` → 명령이 기본 60초를 초과 → `{ timeout: 120000 }`로 상향하거나 장기 작업은 별도 프로세스로 분리.
- `'cat' is not recognized` (Windows) → OS별 명령 차이 → 위 예처럼 `Cypress.platform`으로 분기하거나 npm 스크립트로 추상화.

### cy.focused

현재 포커스를 가진 요소(`document.activeElement`)를 가져온다. Tab 이동, 자동 포커스, 접근성 흐름 검증에 유용하다.

문법: `cy.focused(options)`

```js
// name 인풋 클릭 → 포커스가 #name으로 이동했는지 확인
cy.get('.misc-form').find('#name').click()
cy.focused().should('have.id', 'name')

// description 인풋 클릭 → 포커스가 #description으로 이동했는지 확인
cy.get('.misc-form').find('#description').click()
cy.focused().should('have.id', 'description')
```

자주 겪는 에러와 해결:
- `cy.focused() failed because the element you are chaining off of has become detached` → 포커스 요소가 DOM에서 제거/교체됨 → 포커스를 유발한 액션 직후 단언을 두고, 재렌더링이 끝난 뒤 호출.
- `expected null to exist` 류 실패 → 실제로 포커스된 요소가 없음(`activeElement`가 body) → 단언 전에 `.click()`/`.focus()`/`.tab()`로 포커스가 실제 이동했는지 먼저 확인.

### cy.wrap

일반 JS 값/객체/jQuery/Promise를 Cypress 체인 객체로 감싸, 그 위에 `.should`, `.its`, `.then` 같은 명령을 이어 쓸 수 있게 한다.

문법: `cy.wrap(subject, options)`

```js
// 평범한 객체를 래핑한 뒤 속성 단언을 체인으로 검증
cy.wrap({ foo: 'bar' })
  .should('have.property', 'foo')
  .and('include', 'bar')
```

```js
// Promise를 래핑하면 자동으로 resolve를 기다린다 (POM 헬퍼 반환값 검증에 유용)
cy.wrap(somePromise).then((result) => {
  expect(result).to.equal('done')
})
```

자주 겪는 에러와 해결:
- `cy.wrap()` 한 값에 retry가 안 걸려 보임 → `cy.wrap(value)`는 그 시점의 정적 값만 감쌈 → 매번 최신 값을 평가하려면 `cy.wrap(() => getValue())`처럼 함수를 넘기거나, DOM이라면 `cy.get`을 쓴다.
- alias 저장 시 활용: `cy.wrap(user).as('user')`로 객체를 alias로 저장해 이후 `cy.get('@user')`로 재사용.

### cy.task

브라우저가 아닌 Node 프로세스(`setupNodeEvents`의 plugin)에서 코드를 실행한다. DB 조회/초기화, 파일 시스템 접근 등 브라우저에서 불가능한 작업을 위임할 때 쓴다. (example.cypress.io의 misc 페이지에는 시연 코드가 없으므로 일반 사용법으로 보충한다.)

문법: `cy.task(event, arg, options)`

```js
// cypress.config.js — Node 측에 task 등록
const { defineConfig } = require('cypress')
module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        // 테스트에서 호출할 task: 콘솔에 로그 출력
        log(message) {
          console.log(message)
          return null // task는 반드시 값을 반환해야 함 (undefined 금지)
        },
        // DB 시드 같은 비동기 작업도 Promise 반환으로 처리 가능
        seedDb() {
          return Promise.resolve({ ok: true })
        },
      })
      return config
    },
  },
})
```

```js
// 테스트 코드 — Node task 호출 및 반환값 검증
cy.task('log', 'Node 프로세스에서 출력되는 로그')
cy.task('seedDb').should('deep.equal', { ok: true })
```

자주 겪는 에러와 해결:
- `CypressError: cy.task('xxx') failed ... The task 'xxx' was not handled in the setupNodeEvents` → config에 task 미등록 또는 이벤트명 오타 → `on('task', { ... })`에 동일한 키로 등록.
- `cy.task() must only be invoked from the spec file or support file` → 잘못된 위치 호출 → spec/support 안에서만 호출.
- task가 `undefined`를 반환해 에러 → task는 반드시 무언가를 반환해야 함 → 반환값이 없으면 명시적으로 `return null`.

> 💡 실무 팁: 브라우저에서 못 하는 일(DB·파일·외부 API)은 `cy.task`로 Node에 위임하고, 셸 명령은 `cy.exec`로 분리하라. 단, 구버전의 `cy.server`/`cy.route`(네트워크 stubbing)는 deprecated이므로 새 코드에서는 반드시 `cy.intercept`를 사용한다.

---

<a id="connectors"></a>

## 10. Connectors — 값 연결

이 카테고리는 앞선 명령이 yield 한 값(주로 jQuery 객체나 배열)을 받아서 순회·속성 접근·메서드 호출·구조 분해·후속 작업으로 **연결(connect)** 하는 명령들을 시연한다. Cypress 체인은 동기 변수처럼 다룰 수 없으므로, subject 를 다음 단계로 넘기는 이 커넥터들이 비동기 흐름의 핵심이다.

| 명령 | 받는 subject | 하는 일 |
|------|-------------|---------|
| `.each()` | 배열/유사배열 | 각 요소를 순회 |
| `.its()` | 객체 | 속성 값을 꺼냄 |
| `.invoke()` | 객체 | 메서드를 호출하고 반환값을 yield |
| `.spread()` | 배열 | 배열을 인자로 펼쳐서 전달 |
| `.then()` | 임의 값 | subject 를 콜백으로 받아 후속 작업 |

### .each

각 요소를 순서대로 순회한다. 배열 또는 유사배열(jQuery 컬렉션 등)이 subject 일 때 사용한다.

문법: `.each((element, index, $list) => { ... })`

```js
cy.get('.connectors-each-ul>li')
  // 각 <li> 를 순회: $el(요소), index(인덱스), $list(전체 목록)
  .each(($el, index, $list) => {
    // 디버깅용 출력
    console.log($el, index, $list)
  })
```

- 콜백 안에서 `return false` 를 하면 순회를 즉시 중단할 수 있다.
- 콜백 안에서 Promise/`cy` 명령을 반환하면 해당 작업이 끝날 때까지 다음 반복을 기다린다.

자주 겪는 에러와 해결:
- `cy.each() can only operate on an array like subject` → subject 가 배열/유사배열이 아님(예: `.its('length')` 후 숫자에 `.each`) → 순회 가능한 컬렉션(`cy.get(...)`)에 대해서만 사용.

### .its

subject 의 **속성 값**을 꺼낸다(메서드 호출이 아닌 프로퍼티 접근).

문법: `.its(propertyName)` — 중첩 접근은 `.its('a.b')`, 인덱스는 `.its(0)`

```js
cy.get('.connectors-its-ul>li')
  // 'length' 프로퍼티를 꺼내서 그 값을 다음으로 넘김
  .its('length')
  .should('be.gt', 2) // 길이가 2보다 큰지 검증
```

- 함수를 호출하지 않고 값만 읽으므로, 함수 자체를 꺼내려면 `.its('fnName')`, 호출하려면 `.invoke('fnName')` 를 쓴다.

자주 겪는 에러와 해결:
- `Timed out retrying ... expected undefined to ...` → 존재하지 않는 속성명 또는 비동기로 늦게 생기는 속성 → `.its()` 는 재시도하므로 속성명 오타를 먼저 확인, 옵션으로 `{ timeout }` 상향.

### .invoke

subject 의 **함수(메서드)를 호출**하고 그 반환값을 다음 단계로 yield 한다.

문법: `.invoke(functionName, ...args)`

```js
cy.get('.connectors-div').should('be.hidden')
  // jQuery 의 'show' 메서드를 호출해 요소를 표시
  .invoke('show')
  .should('be.visible') // 이제 보이는지 검증
```

- 인자 전달 가능: `.invoke('text')`, `.invoke('attr', 'href')`, `.invoke('css', 'color', 'red')`.
- 반환값을 그대로 yield 하므로 `.invoke('val').should('eq', '...')` 처럼 체인 연결이 자연스럽다.

자주 겪는 에러와 해결:
- `cy.invoke() errored because the property: 'xxx' returned a 'undefined' value ... not a function` → 해당 이름이 함수가 아니거나 오타 → 함수면 `.invoke`, 값이면 `.its` 로 구분해 사용.

### .spread

배열 subject 를 **개별 인자로 펼쳐서** 콜백에 전달한다. `.then` 의 배열 전용 버전이라고 보면 된다.

문법: `.spread((a, b, c) => { ... })`

```js
const arr = ['foo', 'bar', 'baz']

cy.wrap(arr).spread((foo, bar, baz) => {
  // 배열 요소가 각 인자로 펼쳐져 들어옴
  expect(foo).to.eq('foo')
  expect(bar).to.eq('bar')
  expect(baz).to.eq('baz')
})
```

- `cy.wait([alias1, alias2]).spread(...)` 처럼 여러 alias 응답을 한꺼번에 받을 때 특히 유용하다.

자주 겪는 에러와 해결:
- `cy.spread() requires the existing subject be array-like` → subject 가 배열이 아님 → 배열을 yield 하는 명령(`cy.wrap([...])`, `cy.wait([...])`) 뒤에서만 사용.

### .then

이전 subject 를 콜백 인자로 받아 후속 작업을 한다. 단언, 가공, 값 반환 등에 가장 널리 쓰인다.

문법: `.then((subject) => { ... })`

```js
cy.get('.connectors-list>li').then(($lis) => {
  // jQuery 컬렉션을 받아 직접 검증
  expect($lis).to.have.length(3)
  expect($lis.eq(0)).to.contain('Walk the dog')
  expect($lis.eq(1)).to.contain('Feed the cat')
  expect($lis.eq(2)).to.contain('Write JavaScript')
})
```

`.then` 에서 **무엇을 반환하느냐**에 따라 다음 subject 가 결정된다:

```js
// (1) 값을 return 하면 그 값이 다음 subject 가 됨
cy.wrap(1)
  .then((num) => {
    expect(num).to.equal(1)
    return 2 // 다음으로 2를 넘김
  })
  .then((num) => {
    expect(num).to.equal(2)
  })

// (2) 아무것도 return 하지 않으면 원래 subject 가 그대로 유지됨
cy.wrap(1)
  .then((num) => {
    expect(num).to.equal(1) // return 없음
  })
  .then((num) => {
    expect(num).to.equal(1) // 여전히 1
  })

// (3) cy 명령을 return 없이 호출하면 그 명령의 subject 가 다음으로 넘어감
cy.wrap(1)
  .then((num) => {
    expect(num).to.equal(1)
    cy.wrap(2) // return 하지 않아도 마지막 cy 명령 결과가 yield 됨
  })
  .then((num) => {
    expect(num).to.equal(2)
  })
```

| 콜백 동작 | 다음 subject |
|-----------|-------------|
| 값 `return` | 그 값 |
| 반환 없음 | 원래 subject 유지 |
| `cy` 명령 호출(반환 없어도) | 마지막 cy 명령의 subject |

자주 겪는 에러와 해결:
- `.then()` 안의 단언이 한 번만 실행되고 재시도되지 않음 → `.then` 콜백은 재시도(retry-ability)가 없음 → 자동 재시도가 필요하면 `.should()` 나 `.and()` 콜백을 쓴다.
- DOM 을 jQuery 로 직접 만진 뒤 다음 단계에서 stale element 발생 → `.then` 안에서 끝난 DOM 조작 결과를 후속 cy 명령이 다시 조회하기 때문 → 가능하면 `.invoke()` 등 Cypress 명령으로 대체.

> 💡 실무 팁: 디버깅이나 외부 라이브러리 연동 등 "JS 로 직접 만져야 할 때"만 `.then` 으로 빠지고, 단언은 가능한 한 재시도되는 `.should()` 로 두자. 단순 속성/메서드 접근은 `.its` / `.invoke` 가 더 짧고 안정적이다.

---

<a id="aliasing"></a>

## 11. Aliasing — 별칭

이 카테고리는 `.as()` 로 DOM 요소·네트워크 요청에 별칭(alias)을 붙여 두고, `@alias` 문법으로 이를 재참조하는 방법을 시연한다. 매번 같은 셀렉터를 반복 작성하지 않고, 비동기 네트워크 요청을 기다렸다가 검증할 때 핵심이 되는 기능이다.

### .as

테스트에서 재사용할 대상(DOM 요소·route·request)에 이름표를 붙여 저장한다.

문법: `cy.get(selector).as(aliasName)` / `cy.intercept(...).as(aliasName)`

```js
// DOM 요소에 별칭 저장 — 긴 체이닝 결과를 'firstBtn' 으로 보관
cy.get('.as-table')
  .find('tbody>tr').first()
  .find('td').first()
  .find('button').as('firstBtn') // @ 없이 '이름'만 등록

// 저장한 별칭을 @firstBtn 으로 꺼내 사용
cy.get('@firstBtn').click()

// 같은 요소를 다시 참조해 상태 검증 (셀렉터 재작성 불필요)
cy.get('@firstBtn')
  .should('have.class', 'btn-success')
  .and('contain', 'Changed')
```

- `.as('name')` 호출 시 이름에 `@` 를 붙이지 않는다 (등록할 때는 `'firstBtn'`, 참조할 때만 `@firstBtn`).
- DOM 별칭은 매 참조 시 Cypress 가 셀렉터를 다시 실행하므로, DOM 이 갱신돼도 최신 요소를 가리킨다(detached 안전).

### @alias (별칭 재참조)

저장해 둔 별칭을 `@` 접두어로 다시 불러온다. DOM/route/request 모두 동일한 문법이다.

문법: `cy.get('@aliasName')` / `cy.wait('@aliasName')`

```js
// 1) 네트워크 요청을 가로채 별칭 저장 (cy.intercept 사용 — 권장)
cy.intercept('GET', '**/comments/*').as('getComment')

// 2) 요청을 유발하는 동작 수행
cy.get('.network-btn').click()

// 3) @getComment 요청이 끝날 때까지 대기 후 응답 검증
cy.wait('@getComment').its('response.statusCode').should('eq', 200)
```

| 참조 위치 | 의미 |
|-----------|------|
| `cy.get('@alias')` | 별칭에 저장된 DOM 요소를 다시 가져옴 |
| `cy.wait('@alias')` | 해당 route 의 요청/응답이 완료될 때까지 대기 |
| `cy.get('@alias').its('response.body')` | 가로챈 응답 본문 접근 |

- 자주 겪는 에러 와 해결
  - `cy.get('@getComment') failed because the alias was never defined` → `.as()` 보다 참조가 먼저 실행됨(또는 오타) → `.as()` 등록 코드가 참조보다 앞 줄에 오는지 확인하고 별칭 이름 철자를 맞춘다.
  - `cy.wait() timed out waiting ... for the 1st request to the route` → 클릭/동작이 실제 요청을 발생시키지 못함, 또는 `cy.intercept` 의 URL 패턴 불일치 → 글롭 패턴(`**/comments/*`)이 실제 요청 URL 과 맞는지, 동작 코드가 `cy.wait` 보다 먼저 실행되는지 확인한다.
  - DOM 별칭에서 `element is detached from the DOM` → 캡처 시점의 요소가 리렌더로 교체됨 → 변수에 담지 말고 `cy.get('@alias')` 로 매번 다시 참조한다.

> 💡 실무 팁: 네트워크 별칭은 더 이상 권장되지 않는 `cy.server`/`cy.route` 대신 반드시 `cy.intercept(...).as()` 로 만들고, 동작 직후 `cy.wait('@alias')` 로 응답을 기다려 race condition 을 없애라. 반복 사용하는 셀렉터는 `.as()` 로 한 번만 정의해 두면 셀렉터 변경 시 한 곳만 고치면 된다.

---

<a id="waiting"></a>

## 12. Waiting — 대기

이 카테고리는 Cypress에서 비동기 작업이 끝날 때까지 기다리는 두 가지 방식을 시연한다: 시간 기반 고정대기 `cy.wait(ms)`(지양)와 가로챈 네트워크 요청이 끝날 때까지 기다리는 `cy.wait(@alias)`(권장).

> 핵심 원칙: Cypress의 대부분 명령(`cy.get`, `should` 등)은 자체 재시도(retry-ability)를 내장하므로 고정대기는 거의 필요 없다. 기다려야 한다면 "시간"이 아니라 "조건(네트워크 응답·DOM 상태)"을 기다린다.

### cy.wait(ms) — 고정대기 (지양)

지정한 밀리초만큼 무조건 멈췄다가 다음 명령으로 넘어간다. 사용을 지양해야 하는 안티패턴이다.

**문법:** `cy.wait(ms)`  // ms: 대기할 시간(밀리초)

```javascript
// example.cypress.io 실제 흐름: 입력 후 1000ms씩 고정 대기
cy.get('.wait-input1').type('Wait 1000ms after typing')
cy.wait(1000) // 1초 무조건 대기 (서버가 빠르면 시간 낭비, 느리면 부족할 수 있음)

cy.get('.wait-input2').type('Wait 1000ms after typing')
cy.wait(1000)

cy.get('.wait-input3').type('Wait 1000ms after typing')
cy.wait(1000)
```

왜 지양하는가:

| 문제 | 설명 |
| --- | --- |
| 느림 | 실제로는 200ms면 끝날 작업도 항상 1000ms를 기다려 테스트 전체가 누적적으로 느려진다 |
| 불안정(flaky) | 환경이 느려져 1000ms를 초과하면 그대로 실패한다 |
| 불필요 | 대부분의 경우 `cy.get(...).should(...)`의 자동 재시도가 알아서 기다려 준다 |

**자주 겪는 에러 와 해결**
- 가끔 통과하고 가끔 실패함(flaky) → 고정 시간이 실제 응답 시간을 못 따라감 → `cy.wait(ms)` 대신 `cy.wait('@alias')` 또는 `cy.get(selector).should('be.visible')`로 조건 대기로 전환.
- 테스트가 전체적으로 느림 → 곳곳에 박힌 `cy.wait(숫자)` → 라우트 alias 대기 또는 assertion 재시도로 교체해 불필요한 sleep 제거.

### cy.wait(@alias) — 라우트 대기 (권장)

`cy.intercept(...).as(name)`로 별칭을 붙인 네트워크 요청이 완료될 때까지 기다린 뒤, 가로챈 요청/응답 객체를 yield한다. "시간"이 아니라 "응답 도착"이라는 조건을 기다리므로 빠르고 안정적이다.

**문법:** `cy.wait('@alias')`  // alias: cy.intercept(...).as()로 지정한 이름

```javascript
// example.cypress.io 실제 흐름
// 1) GET /comments/* 요청을 가로채고 별칭 부여
cy.intercept('GET', '**/comments/*').as('getComment')

// 2) 버튼 클릭 시 scripts.js가 comment를 가져온다
cy.get('.network-btn').click()

// 3) getComment 응답이 올 때까지 대기 후, 응답 객체로 단언
cy.wait('@getComment')
  .its('response.statusCode')      // 가로챈 응답에서 상태 코드 추출
  .should('be.oneOf', [200, 304])  // 200(OK) 또는 304(Not Modified) 허용
```

응답 본문이나 요청 검증도 가능하다:

```javascript
cy.intercept('POST', '/users').as('createUser')
cy.get('.submit').click()
cy.wait('@createUser').then((interception) => {
  // interception.request / interception.response 로 양방향 검증
  expect(interception.request.body).to.have.property('name')
  expect(interception.response.statusCode).to.eq(201)
})
```

> **Deprecated 주의:** 과거의 `cy.server()` + `cy.route()`는 Cypress 6부터 deprecated 되었다. 현재는 반드시 **`cy.intercept()`**를 사용한다. `cy.intercept`는 GET뿐 아니라 모든 HTTP 메서드와 fetch/XHR을 모두 가로챈다.

**자주 겪는 에러 와 해결**
- `Timed out retrying after 5000ms: cy.wait() timed out waiting for the 1st request to the route: 'getComment'. No request ever occurred.` → 해당 요청이 발생하지 않았거나 URL 패턴(`**/comments/*`)이 실제 요청과 안 맞음 → `cy.intercept`의 메서드/URL glob 패턴을 실제 네트워크 탭 요청과 대조해 수정. 클릭 등 트리거가 `cy.wait` 호출 전에 실행됐는지 확인.
- `cy.wait() could not find a registered alias for: '@getComment'` → `.as()` 등록 전에 `cy.wait`을 호출했거나 별칭 오타 → `cy.intercept(...).as('getComment')`를 트리거(클릭) **이전에** 선언했는지, 이름 철자가 일치하는지 확인.
- 응답 대기는 됐는데 statusCode가 undefined → `.its('response.statusCode')`에서 응답 미수신 → 요청이 실제로 완료됐는지, stub 응답(`cy.intercept(url, { fixture })`)을 쓰는 경우 그 형태를 점검.

> 💡 실무 팁: `cy.wait(숫자)`가 보이면 거의 항상 리팩터링 신호다. 페이지 진입·버튼 클릭 직후의 API는 `cy.intercept().as()` + `cy.wait('@alias')`로 묶어 응답을 기다리고, 단순 DOM 변화는 `cy.get(...).should('be.visible')`의 자동 재시도에 맡기면 테스트가 빠르면서도 안정적으로 바뀐다.

---

<a id="network"></a>

## 13. Network Requests — 네트워크

이 카테고리는 백엔드와 직접 통신하는 `cy.request`(실제 요청)와, 브라우저가 보내는 요청을 가로채 스텁하거나 대기하는 `cy.intercept`(네트워크 제어)를 시연한다. 과거의 `cy.server`/`cy.route`는 **deprecated** 되었으며, Cypress 6+ 부터는 모두 `cy.intercept`로 대체한다.

| 명령 | 용도 | 실제 네트워크 발생 |
|------|------|------|
| `cy.request` | 서버에 직접 HTTP 요청(브라우저 우회) | O |
| `cy.intercept` | 앱이 보내는 요청을 가로채 감시/스텁/대기 | 가로채기만 (스텁 시 X) |
| ~~`cy.server`/`cy.route`~~ | (deprecated) 구버전 라우팅 | — |

### cy.request

브라우저를 거치지 않고 테스트 러너가 직접 HTTP 요청을 보내 응답을 검증한다. 로그인 토큰 발급, 데이터 시딩(seed), API 단독 검증 등에 쓴다.

문법: `cy.request(url)` 또는 `cy.request(method, url, body)` 또는 `cy.request(options)`

```js
// 1) 기본 GET — 응답 status·body·헤더 검증
cy.request('https://jsonplaceholder.cypress.io/comments')
  .should((response) => {
    expect(response.status).to.eq(200)          // HTTP 상태코드
    expect(response.body).to.have.length(500)   // 응답 배열 길이
    expect(response).to.have.property('headers') // 헤더 존재 확인
    expect(response).to.have.property('duration')// 요청 소요시간 포함
  })

// 2) 요청 결과를 다음 요청으로 넘기기 (체이닝)
cy.request('https://jsonplaceholder.cypress.io/users?_limit=1')
  .its('body.0')                 // 응답 body 배열의 첫 요소 추출
  .then((user) => {
    // 앞서 받은 user.id 로 POST 생성 요청
    cy.request('POST', 'https://jsonplaceholder.cypress.io/posts', {
      userId: user.id,
      title: 'Cypress Test Runner',
      body: 'Fast, easy and reliable testing for anything that runs in a browser.',
    })
  })
  .then((response) => {
    expect(response).property('status').to.equal(201) // 생성 성공
    expect(response.body).property('id').to.be.a('number').and.to.be.gt(100)
  })

// 3) 별칭(as)으로 테스트 컨텍스트 공유 — function() 와 this 사용
cy.request('https://jsonplaceholder.cypress.io/users?_limit=1')
  .its('body.0')
  .as('user')                    // this.user 로 재사용 가능
  .then(function () {
    cy.request('POST', 'https://jsonplaceholder.cypress.io/posts', {
      userId: this.user.id,
      title: 'Cypress Test Runner',
      body: '...',
    }).its('body').as('post')
  })
  .then(function () {
    // 생성된 글의 userId 가 앞 요청의 user.id 와 일치하는지 검증
    expect(this.post, 'post has the right user id')
      .property('userId').to.equal(this.user.id)
  })
```

자주 겪는 에러 와 해결:
- `cy.request() failed ... 4xx/5xx` → 기본적으로 2xx/3xx가 아니면 실패 처리됨 → 의도적으로 에러 응답을 검증하려면 `{ failOnStatusCode: false }` 옵션을 주고 직접 status를 assert 한다.
- `CORS` 에러가 안 나는데 앱에선 막힘 → `cy.request`는 브라우저가 아니라 Node에서 나가므로 CORS·쿠키 정책의 영향을 받지 않는다 → 실제 UI 흐름 검증은 `cy.intercept`로 해야 한다.
- 별칭 사용 시 `this.user` 가 undefined → 화살표 함수에서는 `this`가 바인딩되지 않음 → `.then(function(){...})`처럼 일반 함수로 작성한다.

### cy.intercept

앱(브라우저)이 보내는 네트워크 요청을 가로챈다. 별칭을 걸어 `cy.wait`로 대기하거나, 정적 응답으로 **스텁(stub)** 하여 백엔드 없이 테스트할 수 있다.

문법: `cy.intercept(method, urlPattern, staticResponse?)` 또는 `cy.intercept(routeMatcher, staticResponse?)`

```js
// 1) GET 가로채기 + 별칭 + 대기 — 실제 응답은 통과시키고 감시만
cy.intercept('GET', '**/comments/*').as('getComment')
cy.get('.network-btn').click()
cy.wait('@getComment')                          // 요청이 끝날 때까지 대기
  .its('response.statusCode').should('be.oneOf', [200, 304])

// 2) POST 가로채기 + 요청/응답 동시 검증
cy.intercept('POST', '**/comments').as('postComment')
cy.get('.network-post').click()
cy.wait('@postComment').should(({ request, response }) => {
  expect(request.body).to.include('email')                 // 보낸 본문 확인
  expect(request.headers).to.have.property('content-type') // 요청 헤더 확인
  expect(response && response.body)
    .to.have.property('name', 'Using POST in cy.intercept()')
})

// 3) PUT 응답 스텁 — 서버 없이 404 에러 응답을 강제로 주입
const message = 'whoa, this comment does not exist'
cy.intercept(
  { method: 'PUT', url: '**/comments/*' },      // routeMatcher
  {                                             // staticResponse
    statusCode: 404,
    body: { error: message },
    headers: { 'access-control-allow-origin': '*' },
    delayMs: 500,                               // 응답 지연 시뮬레이션
  }
).as('putComment')

cy.get('.network-put').click()
cy.wait('@putComment')
cy.get('.network-put-comment').should('contain', message) // 스텁된 에러가 화면에 표시되는지
```

자주 겪는 에러 와 해결:
- `Timed out retrying ... cy.wait() ... never occurred` → URL 패턴이 실제 요청과 안 맞거나 method가 다름 → glob 패턴(`**/comments/*`)·메서드를 실제 네트워크 탭과 대조하고, `cy.intercept`를 클릭/액션보다 **먼저** 선언한다.
- 스텁이 안 먹고 실제 응답이 옴 → 세 번째 인자(staticResponse)를 생략하면 통과(pass-through)만 함 → 스텁하려면 응답 객체나 `{ fixture: 'data.json' }`을 반드시 전달한다.
- `cy.server()/cy.route() is deprecated` → 구버전 API → `cy.intercept` 하나로 가로채기·스텁·대기를 모두 처리하도록 교체한다.
- 같은 별칭을 두 번 `cy.wait('@alias')` → 두 번째는 **다음** 요청을 기다림 → 한 요청을 두 번 검증하려면 `cy.wait('@alias').then(...)`로 결과를 받아 재사용한다.

> 💡 실무 팁: API 토큰 발급·데이터 시딩처럼 화면과 무관한 준비 작업은 빠른 `cy.request`로, 실제 사용자 흐름의 로딩·에러·지연 검증은 `cy.intercept`+`cy.wait`로 나눠 쓰면 테스트가 빠르면서도 안정적이다.

---

<a id="files"></a>

## 14. Files — 파일

이 카테고리는 테스트에서 외부 파일을 다루는 명령을 시연한다. 고정 데이터(fixture)를 불러오고, 임의 파일을 읽고, 파일을 생성·갱신하는 흐름을 다룬다.

| 명령 | 용도 | 기본 경로 |
| --- | --- | --- |
| `cy.fixture` | 고정 테스트 데이터 로드 | `cypress/fixtures/` |
| `cy.readFile` | 임의 파일 내용 읽기 | 프로젝트 루트 기준 |
| `cy.writeFile` | 파일 생성/덮어쓰기 | 프로젝트 루트 기준 |

### cy.fixture

`cypress/fixtures/` 폴더의 고정 데이터 파일을 로드한다. 주로 네트워크 응답을 가짜 데이터로 대체할 때 쓴다.

문법: `cy.fixture(filePath, encoding, options) => 파일 내용`

```js
// 1) cy.intercept의 응답을 fixture 파일로 대체 (네트워크 스텁)
//    example.json은 cypress/fixtures/example.json 을 가리킨다 (확장자 생략 가능)
cy.intercept('GET', '**/comments/*', { fixture: 'example.json' }).as('getComment')

cy.get('.fixture-btn').click()

// 가로챈 응답 본문을 검증
cy.wait('@getComment').its('response.body')
  .should('have.property', 'name')
  .and('include', 'Using fixtures to represent data')

// 2) fixture를 alias로 미리 로드해 두고 this로 참조 (function() 콜백 필수)
beforeEach(function () {
  cy.fixture('example.json').as('example') // this.example 로 접근
})
```

자주 겪는 에러와 해결:
- `A fixture file could not be found` → 경로/파일명 오타 또는 `cypress/fixtures/` 밖에 있음 → fixtures 폴더 기준 상대경로로 지정하고 파일 존재 확인.
- `cy.fixture()` 결과를 `this.example`로 못 읽음 → alias를 화살표 함수에서 받음 → `function () {}` 콜백으로 바꿔 `this` 컨텍스트 유지.
- (참고) `cy.server` / `cy.route`는 deprecated → 응답 스텁은 `cy.intercept` + `{ fixture: '...' }` 사용.

### cy.readFile

디스크의 임의 파일을 읽어 내용을 반환한다. `.json`은 자동으로 객체로 파싱된다.

문법: `cy.readFile(filePath, encoding, options) => 파일 내용`

```js
// 프로젝트 루트의 설정 파일을 읽어 객체로 검증
cy.readFile('cypress.config.js').then((config) => {
  // .js/.txt는 문자열, .json은 객체로 반환됨
  expect(config).to.be.an('object')
})
```

자주 겪는 에러와 해결:
- `Timed out retrying ... failed because the file does not exist` → 파일이 아직 없음 → `cy.readFile`은 파일이 생길 때까지 재시도하므로, 끝까지 없으면 경로 확인 또는 `{ timeout }` 조정.
- JSON이 문자열로 들어옴 → 확장자가 `.json`이 아님 → 확장자를 맞추거나 `JSON.parse()`로 직접 파싱.

### cy.writeFile

파일을 생성하거나 덮어쓴다. 객체를 넘기면 JSON으로 직렬화되어 저장된다.

문법: `cy.writeFile(filePath, contents, encoding, options)`

```js
// 1) API 응답을 그대로 fixture 파일로 저장한 뒤 다시 읽어 검증
cy.request('https://jsonplaceholder.cypress.io/users').then((response) => {
  cy.writeFile('cypress/fixtures/users.json', response.body) // 객체 → JSON 저장
})
cy.fixture('users').should((users) => {
  expect(users[0].name).to.exist
})

// 2) 객체를 직접 써넣기 (없으면 생성, 있으면 덮어씀)
cy.writeFile('cypress/fixtures/profile.json', {
  id: 8739,
  name: 'Jane',
  email: 'jane@example.com',
})
cy.fixture('profile').should((profile) => {
  expect(profile.name).to.eq('Jane')
})
```

자주 겪는 에러와 해결:
- 기존 내용이 통째로 사라짐 → `cy.writeFile`은 기본이 덮어쓰기 → 이어붙이려면 `{ flag: 'a+' }` 옵션 사용.
- `EACCES: permission denied` → 쓰기 권한 없는 경로 → 프로젝트 내부 경로로 변경하거나 권한 확인.
- 의도와 다른 형식으로 저장됨 → 문자열로 저장하고 싶은데 객체를 넘김(또는 반대) → 문자열은 그대로, 객체는 JSON으로 저장됨을 인지하고 타입 맞추기.

> 💡 실무 팁: 테스트 입력은 `cy.fixture`로 분리하고, 테스트 중 만들어진 결과나 토큰은 `cy.writeFile`로 fixtures에 저장해 후속 테스트에서 재사용하면 데이터 의존성을 깔끔하게 관리할 수 있다.

---

<a id="storage"></a>

## 15. Storage & Cookies — 저장소/쿠키

이 카테고리는 브라우저 **localStorage 초기화**와 **쿠키 CRUD**(읽기·쓰기·삭제)를 다룬다. 테스트 간 상태를 깨끗하게 만들거나, 로그인 토큰 같은 값을 미리 심어 사전 조건을 세팅할 때 핵심이 되는 명령들이다.

> 참고: Cypress는 테스트마다 자동으로 쿠키/localStorage를 비운다(`test isolation`). 따라서 아래 clear 명령들은 "한 테스트 안에서 중간에 비우고 검증"하거나, 특정 키만 선택적으로 지울 때 주로 쓴다.

### cy.clearLocalStorage

- 한 줄 설명: localStorage 의 키를 전부 또는 일부(문자열/정규식 매칭) 삭제한다.
- 문법: `cy.clearLocalStorage()` | `cy.clearLocalStorage(key)` | `cy.clearLocalStorage(regExp)`

```js
// 1) 페이지 버튼을 눌러 localStorage 에 prop1/2/3 값을 세팅
cy.get('.ls-btn').click()
cy.get('.ls-btn').should(() => {
  expect(localStorage.getItem('prop1')).to.eq('red')
  expect(localStorage.getItem('prop2')).to.eq('blue')
  expect(localStorage.getItem('prop3')).to.eq('magenta')
})

// 2) 전체 삭제 — 모든 키가 null 이 됨
cy.clearLocalStorage()
cy.getAllLocalStorage().should(() => {
  expect(localStorage.getItem('prop1')).to.be.null
  expect(localStorage.getItem('prop2')).to.be.null
})

// 3) 특정 키만 삭제 (문자열 매칭) — prop1 만 사라지고 나머지는 유지
cy.clearLocalStorage('prop1')

// 4) 정규식으로 여러 키 삭제 — prop1, prop2 매칭 삭제
cy.clearLocalStorage(/prop1|2/)
```

자주 겪는 에러와 해결:
- `localStorage.getItem(...) is null` 인데 비우지도 않았는데 비어있음 → 테스트 격리로 매 테스트 시작 시 이미 초기화됨 → 같은 `it()` 블록 안에서 세팅→검증을 함께 수행한다.
- 동기 콜백(`.should(() => {...})`) 안에서 `cy.*` 를 또 호출 → 콜백은 동기 단언 전용 → 콜백 안에서는 순수 `localStorage`/`expect` 만 쓴다.

### cy.getCookie

- 한 줄 설명: 이름으로 단일 쿠키 객체를 가져온다(없으면 `null`).
- 문법: `cy.getCookie(name)`

```js
// 페이지 버튼 클릭으로 token 쿠키 생성 후, 값 검증
cy.get('#getCookie .set-a-cookie').click()
cy.getCookie('token').should('have.property', 'value', '123ABC')
```

자주 겪는 에러와 해결:
- 항상 `null` 반환 → 쿠키 도메인/path 가 현재 URL과 불일치 → `cy.visit()` 로 같은 도메인에 먼저 진입한 뒤 조회한다.

### cy.getCookies

- 한 줄 설명: 현재 도메인의 모든 쿠키를 배열로 가져온다.
- 문법: `cy.getCookies()`

```js
cy.getCookies().should('be.empty') // 초기엔 비어 있음
cy.get('#getCookies .set-a-cookie').click()
cy.getCookies()
  .should('have.length', 1)
  .should((cookies) => {
    // 쿠키 객체의 주요 속성 검증
    expect(cookies[0]).to.have.property('name', 'token')
    expect(cookies[0]).to.have.property('value', '123ABC')
    expect(cookies[0]).to.have.property('httpOnly', false)
    expect(cookies[0]).to.have.property('secure', false)
    expect(cookies[0]).to.have.property('domain')
    expect(cookies[0]).to.have.property('path')
  })
```

### cy.setCookie

- 한 줄 설명: 쿠키를 직접 생성/설정한다(로그인 토큰 등 사전 조건 세팅용).
- 문법: `cy.setCookie(name, value, options)`

```js
cy.getCookies().should('be.empty')
cy.setCookie('foo', 'bar') // 쿠키 직접 주입
cy.getCookie('foo').should('have.property', 'value', 'bar')
```

자주 겪는 에러와 해결:
- 설정했는데 사라짐 → 도메인 옵션 미지정 시 현재 URL 기준으로 잡힘 → `cy.visit()` 이후 호출하거나 `{ domain: '...' }` 명시.

### cy.clearCookie

- 한 줄 설명: 이름으로 단일 쿠키를 삭제한다.
- 문법: `cy.clearCookie(name)`

```js
cy.getCookie('token').should('be.null')
cy.get('#clearCookie .set-a-cookie').click()
cy.getCookie('token').should('have.property', 'value', '123ABC')

cy.clearCookie('token') // token 쿠키 삭제
cy.getCookie('token').should('be.null')
```

### cy.clearCookies

- 한 줄 설명: 현재 도메인의 모든 쿠키를 삭제한다.
- 문법: `cy.clearCookies()`

```js
cy.getCookies().should('be.empty')
cy.get('#clearCookies .set-a-cookie').click()
cy.getCookies().should('have.length', 1)

cy.clearCookies() // 전체 쿠키 삭제
cy.getCookies().should('be.empty')
```

#### 명령 요약

| 명령 | 대상 | 동작 |
|---|---|---|
| `cy.clearLocalStorage()` | localStorage | 전체/키/정규식 삭제 |
| `cy.getCookie(name)` | 쿠키 1개 | 읽기(없으면 null) |
| `cy.getCookies()` | 쿠키 전체 | 배열로 읽기 |
| `cy.setCookie(n, v)` | 쿠키 1개 | 쓰기/주입 |
| `cy.clearCookie(name)` | 쿠키 1개 | 삭제 |
| `cy.clearCookies()` | 쿠키 전체 | 삭제 |

> ⚠️ Deprecated: 예전의 `cy.server()` / `cy.route()` 로 응답을 가로채던 방식은 더 이상 권장되지 않는다. 네트워크 스텁/가로채기는 `cy.intercept()` 를 사용한다. 또한 세션 단위로 쿠키·localStorage를 캐싱·복원하려면 `cy.session()` 을 활용하면 로그인 사전조건 세팅이 훨씬 빨라진다.

> 💡 실무 팁: 로그인 토큰처럼 매 테스트마다 필요한 상태는 `cy.setCookie()`/localStorage 주입을 `cy.session()` 으로 감싸 캐싱하면 UI 로그인 단계를 건너뛰어 실행 속도를 크게 줄일 수 있다.

---

<a id="spies"></a>

## 16. Spies, Stubs & Clocks — 스파이/스텁/시계

이 카테고리는 Cypress에 내장된 [Sinon.JS](https://sinonjs.org/) 기능을 활용해 **함수 호출을 감시(spy)** 하거나, **원래 동작을 가짜로 대체(stub)** 하거나, **브라우저의 시간(`Date`, `setTimeout`, `setInterval`)을 직접 제어(clock/tick)** 하는 방법을 시연한다. 외부 의존성·콜백·타이머에 묶인 코드를 결정론적으로 테스트할 때 쓴다.

| 명령 | 핵심 역할 | 원래 함수 실행? |
|------|-----------|----------------|
| `cy.spy` | 호출 여부·인자·횟수만 **감시** | O (그대로 실행) |
| `cy.stub` | 동작을 **가짜로 대체** (반환값/예외 지정) | X (기본은 미실행) |
| `cy.clock` | 시간·타이머를 **가짜로 고정/제어** | — |
| `cy.tick` | 고정된 시간을 **앞으로 진행** | — |

### cy.spy

함수가 호출되었는지, 어떤 인자로 몇 번 불렸는지 감시하는 래퍼다. 원래 동작은 그대로 유지한다.

문법: `cy.spy(object, 'method') => spy` / 별칭은 `.as('name')`

```javascript
const obj = {
  foo() {},
}

// foo 함수를 감시하고 'foo' 별칭을 붙임
cy.spy(obj, 'foo').as('foo')

// 시간차를 두고 두 번 호출 (실제 코드의 비동기 호출을 흉내)
setTimeout(() => { obj.foo() }, 500)
setTimeout(() => { obj.foo() }, 2500)

// should + 별칭은 재시도(retry)되므로 비동기 호출을 자동으로 기다림
cy.get('@foo').should('have.been.calledTwice')

// 인자까지 검증 — Cypress.sinon.match 로 유연하게 매칭 가능
const calculator = { add(a, b) { return a + b } }
const spy = cy.spy(calculator, 'add').as('add')

expect(calculator.add(2, 3)).to.equal(5) // spy 는 원래 함수를 그대로 실행
expect(spy).to.be.calledWith(2, 3)
expect(spy).to.be.calledWith(Cypress.sinon.match.number, 3) // 타입 매처
```

자주 겪는 에러 와 해결:
- `expected foo to have been called` (호출 안 됨) → 비동기 호출을 동기 `expect`로 즉시 단언함 → `expect` 대신 `cy.get('@alias').should('have.been.called')`로 바꿔 재시도를 태운다.
- `cy.spy()` 가 무시되는 듯함 → 모듈을 `import`로 가져와 메서드 참조가 동결됨 → 객체에서 호출되는 `obj.method` 형태여야 감시 가능하다(직접 import한 named export는 spy로 못 가로챔).

### cy.stub

함수를 가짜로 대체해 반환값·예외·인자별 동작을 지정한다. `cy.spy`와 달리 원래 함수는 기본적으로 실행되지 않는다.

문법: `cy.stub(object, 'method') => stub` (체이닝: `.returns()`, `.throws()`, `.withArgs()`, `.callThrough()`, `.resolves()`)

```javascript
const greeter = {
  greet(name) { return `Hello, ${name}!` },
}

cy.stub(greeter, 'greet')
  .callThrough() // 매칭 안 되면 원래 함수 실행
  .withArgs(Cypress.sinon.match.string).returns('Hi')          // 문자열 인자면 'Hi' 반환
  .withArgs(Cypress.sinon.match.number).throws(new Error('Invalid name')) // 숫자면 예외

expect(greeter.greet('World')).to.equal('Hi')          // 가로챈 반환값
expect(() => greeter.greet(42)).to.throw('Invalid name') // 가로챈 예외
expect(greeter.greet).to.have.been.calledTwice
expect(greeter.greet()).to.equal('Hello, undefined!')  // 매칭 실패 → callThrough 로 원래 동작
```

> `Cypress.sinon.match` 은 인자 매처다. `match.string`(타입), `match(2)`(값), `match.any`(아무거나), `match.in([...])`(목록 포함), 커스텀 함수 `match(fn, '설명')`, 그리고 `.and()` / `.or()` 조합까지 지원한다.

자주 겪는 에러 와 해결:
- stub인데 원래 함수가 실행됨 → `.callThrough()`를 붙였거나, 매칭되는 `.withArgs()`가 없어 통과됨 → 의도와 다르면 `.callThrough()`를 제거하고 기본 `.returns()`를 지정한다.
- Promise를 반환해야 하는데 동기 값이 옴 → `.returns(value)`로 일반 값을 줌 → 비동기는 `.resolves(value)` / `.rejects(err)`를 사용한다.

### cy.clock

브라우저의 `Date`, `setTimeout`, `setInterval`, `requestAnimationFrame` 을 가짜로 교체해 시간을 고정한다. 반드시 `cy.visit` 전에 호출해야 페이지 로드 시점부터 적용된다.

문법: `cy.clock(now?, functionNames?, options?)`

```javascript
// UTC 2017-03-14 00:00:00 → epoch 1489449600(초)
const now = new Date(Date.UTC(2017, 2, 14)).getTime()

cy.clock(now) // 시간을 고정 — visit 전에 호출
cy.visit('https://example.cypress.io/commands/spies-stubs-clocks')

cy.get('#clock-div').click()
// 페이지가 Date.now() 로 찍은 값이 항상 동일 → 결정론적 검증 가능
cy.get('#clock-div').should('have.text', '1489449600')
```

자주 겪는 에러 와 해결:
- 시간이 고정되지 않음 → `cy.visit` **이후**에 `cy.clock`을 호출함 → 반드시 `visit` 전에 호출한다.
- 특정 타이머만 멈추고 싶음 → 전부 가짜로 바뀌어 다른 동작이 멈춤 → `cy.clock(now, ['Date', 'setTimeout'])`처럼 대상 함수명을 배열로 지정한다.

### cy.tick

`cy.clock`으로 고정한 시간을 지정한 밀리초만큼 앞으로 진행시켜, 대기 중인 타이머 콜백을 즉시 발화시킨다.

문법: `cy.tick(milliseconds)` (선행 `cy.clock` 필수)

```javascript
const now = new Date(Date.UTC(2017, 2, 14)).getTime()

cy.clock(now)
cy.visit('https://example.cypress.io/commands/spies-stubs-clocks')

cy.get('#tick-div').click()
cy.get('#tick-div').should('have.text', '1489449600')

cy.tick(10000) // 가짜 시계를 10초(10000ms) 앞으로 — setTimeout 등이 즉시 실행됨
cy.get('#tick-div').click()
cy.get('#tick-div').should('have.text', '1489449610')
```

자주 겪는 에러 와 해결:
- `cy.tick() requires a clock to exist` → 앞서 `cy.clock`을 호출하지 않음 → `cy.tick` 전에 반드시 `cy.clock`을 둔다.
- 콜백이 실행되지 않음 → `tick` 값이 타이머 지연보다 작음 → `setTimeout(fn, 3000)`이면 `cy.tick(3000)` 이상으로 진행한다.

> 참고: 네트워크 가로채기는 더 이상 `cy.server` / `cy.route`(deprecated)를 쓰지 않고 **`cy.intercept`** 를 사용한다. `cy.spy`/`cy.stub`은 함수 호출 감시·대체용, `cy.intercept`는 HTTP 요청 감시·대체용으로 역할이 다르다.

> 💡 실무 팁: 비동기 호출을 검증할 땐 동기 `expect(spy)` 대신 `cy.get('@alias').should(...)`로 별칭을 단언해 재시도 메커니즘을 태우고, 시간 의존 로직(폴링·디바운스·자동 로그아웃)은 `cy.clock` + `cy.tick` 조합으로 실제 대기 없이 결정론적으로 테스트하자.

---

<a id="utilities"></a>

## 17. Utilities — 유틸리티

이 카테고리는 Cypress가 내부적으로 번들링한 외부 유틸리티 라이브러리를 `Cypress.*` 네임스페이스로 노출하여, 별도 설치나 import 없이 테스트 안에서 바로 쓰는 방법을 시연한다. 핵심은 이들이 모두 동기(synchronous) 함수라는 점이며, 명령 큐(command queue)에 들어가는 `cy.*` 명령과는 실행 시점이 다르다는 것이다.

| 유틸리티 | 정체 | 주 용도 | 동기/비동기 |
|---|---|---|---|
| `Cypress._` | Lodash | 데이터 가공(map/filter/chain 등) | 동기 |
| `Cypress.$` | jQuery | DOM 직접 조회·조작 | 동기 |
| `Cypress.Blob` | blob-util | 문자열·base64·이미지 ↔ Blob 변환 | Promise 반환 |
| `Cypress.minimatch` | minimatch | glob 패턴 매칭(주로 `cy.intercept` URL) | 동기 |
| `Cypress.Promise` | Bluebird | 커스텀 Promise 생성 | 비동기 |

### Cypress._

Lodash 전체 API를 `Cypress._`로 노출한다. 보통 `cy.request`/`cy.then`으로 받은 응답 데이터를 가공할 때 쓴다.

문법: `Cypress._.<lodashMethod>(...)`

```js
cy.request('https://jsonplaceholder.cypress.io/users')
  .then((response) => {
    // 응답 body에서 id만 뽑아 앞 3개를 추출 (chain → map → take → value)
    const ids = Cypress._.chain(response.body).map('id').take(3).value()

    // 가공 결과 검증
    expect(ids).to.deep.eq([1, 2, 3])
  })
```

자주 겪는 에러와 해결:
- `Cypress._ is undefined` → 테스트 코드가 아닌 `cypress.config.js` 같은 Node 컨텍스트에서 호출 → `Cypress._`는 브라우저 측 spec 안에서만 유효하다. Node 쪽이면 `npm i lodash` 후 직접 import.
- 체이닝 결과가 그대로 안 나옴 → `_.chain()`은 lazy 래퍼라 `.value()`를 호출해야 실제 값이 풀린다.

### Cypress.$

번들된 jQuery를 동기적으로 노출한다. `cy.get`과 달리 재시도(retry)·대기 없이 즉시 DOM을 조회하므로, 반환된 요소는 `cy.wrap`으로 감싸 Cypress 명령 체인에 넣는다.

문법: `Cypress.$(selector)`

```js
// 즉시(동기) 조회 — 재시도 없음
const $li = Cypress.$('.utility-jquery li:first')

// jQuery 객체를 Cypress 체인으로 끌어올려 단언/조작
cy.wrap($li).should('not.have.class', 'active')
cy.wrap($li).click()
cy.wrap($li).should('have.class', 'active')
```

자주 겪는 에러와 해결:
- 요소를 못 찾아 `null`/빈 컬렉션 반환 → `Cypress.$`는 대기하지 않아 아직 렌더 전일 수 있음 → 비동기 렌더 요소는 `Cypress.$` 대신 자동 재시도하는 `cy.get`을 사용.
- `cy.wrap($el)` 후 단언이 stale → DOM이 다시 그려진 뒤 옛 참조를 잡고 있는 경우 → 시점마다 다시 `Cypress.$`로 조회하거나 `cy.get`으로 전환.

### Cypress.Blob

blob-util 라이브러리로, 문자열·base64·dataURL·이미지 등을 Blob과 상호 변환한다. 일부 메서드는 **Promise를 반환**하므로 `.then`으로 받아야 한다.

문법: `Cypress.Blob.<method>(...)` (예: `imgSrcToDataURL`, `arrayBufferToBlob`, `blobToBase64String`)

```js
cy.get('.utility-blob').then(($div) => {
  // 이미지 URL을 base64 dataURL로 변환 (CORS 모드 'anonymous')
  return Cypress.Blob.imgSrcToDataURL(
    'https://example.cypress.io/assets/img/javascript-logo.png',
    undefined,
    'anonymous',
  ).then((dataUrl) => {
    // dataURL을 src로 가진 <img>를 jQuery로 만들어 DOM에 주입
    const img = Cypress.$('<img />', { src: dataUrl })
    $div.append(img)

    // 주입된 이미지가 정상 렌더되었는지 검증
    cy.get('.utility-blob img').click()
    cy.get('.utility-blob img').should('have.attr', 'src', dataUrl)
  })
})
```

자주 겪는 에러와 해결:
- `Cypress.Blob.method is not a function` → Cypress 5+에서 blob-util 버전이 올라가며 API명이 바뀜(`base64StringToBlob`, `imgSrcToDataURL` 등) → 최신 메서드명 확인.
- 이미지 변환 시 CORS 오류 / 빈 dataURL → 교차 출처 이미지는 `crossOrigin`을 `'anonymous'`로 주고, 서버가 CORS 헤더를 허용해야 함.

### Cypress.minimatch

minimatch로 문자열이 glob 패턴에 맞는지 동기 검사한다. 실무에서는 `cy.intercept`의 URL 매칭 패턴을 콘솔에서 미리 검증할 때 유용하다.

문법: `Cypress.minimatch(target, pattern, options)` → `boolean`

```js
// '/users/1/comments' 문자열이 '/users/*/comments' 패턴에 맞는지 검사 → true
const matched = Cypress.minimatch('/users/1/comments', '/users/*/comments', {
  matchBase: true,
})
expect(matched).to.be.true
```

자주 겪는 에러와 해결:
- `cy.intercept`가 의도한 요청을 안 잡음 → 경로 매칭이 어긋남 → 실제 URL과 패턴을 `Cypress.minimatch`로 직접 찍어보며 `*`(한 세그먼트) vs `**`(여러 세그먼트) 구분 점검.
- 쿼리스트링까지 매칭하고 싶을 때 안 맞음 → glob는 `?`를 한 글자 와일드카드로 해석 → 쿼리 포함 매칭은 정규식이나 `cy.intercept`의 객체 형태(`{ pathname, query }`)를 사용.

### Cypress.Promise

번들된 Bluebird Promise 생성자다. 테스트 안에서 커스텀 비동기 작업을 만들고, `cy.then` 안에서 반환하면 Cypress가 해당 Promise 해소(resolve)를 기다린다.

문법: `new Cypress.Promise((resolve, reject) => { ... })`

```js
let waited = false

function waitOneSecond () {
  // 1초 후 resolve 되는 커스텀 Promise 생성
  return new Cypress.Promise((resolve, reject) => {
    setTimeout(() => {
      waited = true
      resolve('foo')
    }, 1000)
  })
}

cy.then(() =>
  // cy.then 안에서 Promise를 return → Cypress가 resolve까지 대기
  waitOneSecond().then((str) => {
    expect(str).to.eq('foo')
    expect(waited).to.be.true
  }),
)
```

자주 겪는 에러와 해결:
- 단언이 Promise 완료 전에 실행됨 → `cy.then` 콜백에서 Promise를 `return`하지 않음 → 반드시 `return`해야 Cypress가 기다린다.
- `Timed out retrying` / 영원히 pending → `resolve`/`reject`를 호출하지 않는 코드 경로 존재 → 모든 분기에서 종료를 보장하고, 실패는 `reject`로 명시.

> 💡 실무 팁: `Cypress.*` 유틸은 명령 큐에 안 들어가는 동기 함수(`Promise` 제외)라, 비동기로 렌더되는 DOM이나 네트워크 결과에 의존할 땐 `Cypress.$` 대신 재시도하는 `cy.get`/`cy.then`과 조합해 쓰는 것이 안전하다. (참고: `cy.server`/`cy.route`는 deprecated이며 네트워크 가로채기는 `cy.intercept`를 사용한다.)

---

<a id="api"></a>

## 18. Cypress API — 전역 API

이 카테고리는 `cy.*` 체인 명령이 아닌, 테스트 런타임 전역에서 동기적으로 호출하는 `Cypress.*` API(설정 읽기/쓰기, 환경변수, 커스텀 명령 등록, 플랫폼·아키텍처·버전 정보, 세션 캐시 등)를 시연한다.

| 명령 | 한 줄 요약 | 반환/성격 |
|------|-----------|-----------|
| `Cypress.config` | 런타임 설정 읽기/쓰기 | 동기, 객체 또는 값 |
| `Cypress.env` | 환경변수 읽기/쓰기 | 동기, 값 |
| `Cypress.Commands.add` | 커스텀 명령 등록 | 등록(반환 없음) |
| `Cypress.dom` | DOM 판별 유틸 | 동기, boolean 등 |
| `Cypress.platform` | OS 플랫폼 문자열 | 동기, string |
| `Cypress.arch` | CPU 아키텍처 | 동기, string |
| `Cypress.version` | Cypress 버전 | 동기, string |
| `Cypress.spec` | 현재 실행 중 스펙 정보 | 동기, 객체 |
| `Cypress.log` | 커맨드 로그에 항목 추가 | 로그 출력 |
| `Cypress.session` | 세션 캐시 제어 | 동기 유틸 |

> 핵심: `Cypress.*` 는 **동기**다. `cy.*` 처럼 큐에 쌓여 나중에 실행되지 않는다. 그래서 `cy.get(...).then()` 안에서 시점을 맞춰 호출하는 패턴이 자주 필요하다.

### Cypress.config

런타임에 Cypress 설정값을 읽거나 그 자리에서 덮어쓴다.

문법: `Cypress.config()` · `Cypress.config(key)` · `Cypress.config(key, value)` · `Cypress.config(object)`

```js
// 전체 설정 객체를 받아온다
const myConfig = Cypress.config()
expect(myConfig).to.have.property('animationDistanceThreshold', 5)

// 특정 키만 읽기
expect(Cypress.config('pageLoadTimeout')).to.eq(60000)

// 특정 키 덮어쓰기 (현재 스펙 실행 동안에만 유효)
Cypress.config('pageLoadTimeout', 20000)
expect(Cypress.config('pageLoadTimeout')).to.eq(20000)
```

자주 겪는 에러 와 해결:
- 덮어쓴 값이 다음 스펙에서 사라짐 → `Cypress.config()` 변경은 **현재 스펙 파일 범위**에만 적용된다(영구 아님) → 영구 변경은 `cypress.config.js`의 `e2e` 블록에서 설정한다.
- `baseUrl` 같은 일부 키는 런타임에서 변경해도 즉시 반영 안 됨 → 런타임 변경 불가/제약 키 존재 → 가급적 설정 파일에서 정의한다.

### Cypress.env

`cypress.env.json`·CLI·OS 환경변수로 주입된 환경변수를 읽거나 런타임에 설정한다.

문법: `Cypress.env()` · `Cypress.env(key)` · `Cypress.env(key, value)` · `Cypress.env(object)`

```js
// 전체 env 객체
const all = Cypress.env()

// 단일 값 읽기
const apiUrl = Cypress.env('API_URL')

// 런타임에 설정 (현재 스펙 범위)
Cypress.env('host', 'veronica.dev.local')
expect(Cypress.env('host')).to.eq('veronica.dev.local')
```

> 참고: 과거 데모에 있던 `Cypress.expose()`/`Cypress.Cookies.debug()` 류는 더 이상 권장되지 않는다. 환경변수는 `Cypress.env`, 쿠키 디버깅은 `cy.intercept`/브라우저 도구로 대체한다.

자주 겪는 에러 와 해결:
- `Cypress.env('X')` 가 `undefined` → 변수명 오타 또는 주입 경로 누락 → `cypress.env.json`, `--env X=값`, 또는 `CYPRESS_X` OS 변수 중 하나로 주입했는지 확인.
- 민감정보가 리포트/로그에 노출 → env 값이 커맨드 로그에 찍힘 → 비밀값은 CI 시크릿으로만 주입하고 코드에 하드코딩하지 않는다.

### Cypress.Commands.add (커스텀 명령)

자주 쓰는 동작을 `cy.myCommand()` 형태의 재사용 명령으로 등록한다.

문법: `Cypress.Commands.add(name, [options], callbackFn)`

```js
// 선행 subject를 받는 커스텀 명령 (체인 가능형)
Cypress.Commands.add('console', { prevSubject: true }, (subject, method) => {
  method = method || 'log'
  // 콘솔에 현재 subject를 출력 (디버깅용)
  console[method]('The subject is', subject)
  return subject // 체인 유지를 위해 subject 그대로 반환
})

// 사용 예: 요소를 잡아 콘솔에 찍고 계속 체이닝
cy.get('button').console('info').should('exist')
```

| `prevSubject` 값 | 의미 |
|------------------|------|
| `false` (기본) | 부모 명령, 선행 subject 없음 (`cy.login()`) |
| `true` | 자식 명령, 선행 subject 필수 |
| `'optional'` | 선행 subject 있어도/없어도 동작 |
| `'element'` | 선행 subject가 DOM 요소여야 함 |

자주 겪는 에러 와 해결:
- `CypressError: cy.console() is already defined` → 같은 이름을 중복 등록 → 덮어쓸 때는 `Cypress.Commands.overwrite(name, fn)` 사용.
- 커스텀 명령이 인식 안 됨 → `cypress/support/e2e.js`(또는 `commands.js`)에서 정의/임포트 안 됨 → support 파일에 등록해 모든 스펙에서 로드되게 한다.

### Cypress.dom

요소의 가시성·DOM 여부 등을 판별하는 동기 유틸 모음.

문법: `Cypress.dom.isHidden(el)` · `Cypress.dom.isVisible(el)` · `Cypress.dom.isDom(obj)` 등

```js
// jQuery로 raw DOM 요소를 꺼낸다
const hiddenP = Cypress.$('.dom-p p.hidden').get(0)
const visibleP = Cypress.$('.dom-p p.visible').get(0)

// 가시성 판별
expect(Cypress.dom.isHidden(hiddenP)).to.be.true
expect(Cypress.dom.isHidden(visibleP)).to.be.false
```

자주 겪는 에러 와 해결:
- `isHidden`에 jQuery 객체를 넘겨 결과가 이상함 → API는 **raw DOM 요소**를 기대 → `Cypress.$(...).get(0)`으로 실제 엘리먼트를 꺼내 전달한다.

### Cypress.platform

테스트가 도는 OS 플랫폼 문자열(`darwin`, `win32`, `linux`)을 반환한다.

문법: `Cypress.platform`

```js
expect(Cypress.platform).to.exist
// OS별 분기 처리
if (Cypress.platform === 'win32') {
  // 윈도우 전용 처리
}
```

### Cypress.arch

OS CPU 아키텍처(`x64`, `arm64` 등)를 반환한다.

문법: `Cypress.arch`

```js
expect(Cypress.arch).to.exist
```

### Cypress.version

현재 설치된 Cypress 버전 문자열을 반환한다.

문법: `Cypress.version`

```js
expect(Cypress.version).to.exist
// 버전 의존 분기 (semver 비교 예)
const [major] = Cypress.version.split('.').map(Number)
if (major >= 12) {
  // 신버전 전용 동작
}
```

### Cypress.spec

현재 실행 중인 스펙 파일 정보(이름·경로 등)를 담은 객체.

문법: `Cypress.spec`

```js
// 현재 스펙 메타데이터
expect(Cypress.spec).to.have.property('name')
cy.log(`실행 스펙: ${Cypress.spec.relative}`)
```

| 속성 | 의미 |
|------|------|
| `name` | 스펙 파일명 |
| `relative` | 프로젝트 루트 기준 상대 경로 |
| `absolute` | 절대 경로 |
| `specType` | `integration` / `component` |

### Cypress.log

Cypress 커맨드 로그(Test Runner 좌측 패널)에 직접 로그 항목을 추가한다. 주로 커스텀 명령 내부에서 사용.

문법: `Cypress.log(options)`

```js
Cypress.Commands.add('clickLink', (label) => {
  // 커맨드 로그에 보기 좋은 항목 추가
  Cypress.log({
    name: 'clickLink',
    message: label,
    consoleProps: () => ({ '클릭한 링크': label }), // 콘솔 펼침 정보
  })
  cy.get('a').contains(label).click()
})
```

자주 겪는 에러 와 해결:
- 로그가 두 번 찍힘 → 커스텀 명령 안에서 `Cypress.log` 호출 + 내부 `cy.*` 명령의 기본 로그가 겹침 → 내부 명령에 `{ log: false }`를 주어 중복을 제거한다.

### Cypress.session

`cy.session()`이 캐시한 세션(쿠키·localStorage 등)을 조회/초기화하는 유틸. 로그인 상태 재사용 최적화에 쓴다.

문법: `Cypress.session.clearAllSavedSessions()` · `Cypress.session.clearCurrentSessionData()`

```js
beforeEach(() => {
  // setup 함수의 작업을 캐시해 재로그인 비용 절감
  cy.session('user', () => {
    cy.visit('/login')
    cy.get('#user').type('philip')
    cy.get('#pass').type(Cypress.env('PASSWORD'))
    cy.get('form').submit()
  })
})

// 디버깅 시 저장된 세션 전부 비우기
Cypress.session.clearAllSavedSessions()
```

자주 겪는 에러 와 해결:
- `cy.session` 결과가 캐시되지 않고 매번 재실행 → setup 콜백 내용/이름(id)이 매번 달라짐 → 세션 id를 고정하고 콜백을 결정적으로 유지한다.
- 로그인 후에도 인증 안 된 상태 → `cy.session`은 `cy.visit`을 자동 호출하지 않음 → 세션 블록 밖에서 보호 페이지로 `cy.visit` 한다(필요 시 `validate` 콜백 추가).
- (deprecated 참고) 네트워크 모킹은 `cy.server`/`cy.route` 가 아니라 `cy.intercept` 를 사용한다.

> 💡 실무 팁: `Cypress.*`는 동기 호출이라 `cy.*` 큐와 시점이 어긋나기 쉬우니, 요소 상태에 의존하는 값은 `cy.get(...).then(($el) => { ... })` 안에서 읽고, 로그인 같은 반복 비용은 `cy.session`으로 캐싱해 스위트 실행시간을 줄여라.

---

<a id="common-errors"></a>

## 19. 공통 에러 패턴 & 디버깅

### 들어가기 전: 에러를 빨리 읽는 법

Cypress 에러는 거의 항상 **무엇을 / 얼마나 기다렸고 / 왜 실패했는지**를 한 문장에 담고 있다. 메시지의 키워드만 봐도 원인 분류가 가능하다.

| 키워드 | 분류 | 1차 의심 |
|---|---|---|
| `Timed out retrying ... never found it` | 요소 못 찾음 | 셀렉터 오타, 비동기 렌더, iframe |
| `not visible` / `display: none` | 가시성 | CSS 숨김, 애니메이션 |
| `being covered by another element` | 가림 | 오버레이, 스피너, sticky 헤더 |
| `detached from the DOM` | 재렌더 | 요소 캐시 후 재사용 |
| `cross origin error` | 출처 | 도메인 이동 → `cy.origin` |
| `cy.visit() failed` | 진입 | URL/네트워크/HTTP 상태 |

> 디버깅 공통 무기: `cy.pause()`(중단), `.debug()`(콘솔에 subject 출력), Test Runner 우측의 **Command Log 스냅샷 호버**, `DEBUG=cypress:* npx cypress run`(상세 로그).

---

### 에러/증상 1 — Timed out retrying ... expected to find element ... never found it

**대표 에러**
```
Timed out retrying after 4000ms: Expected to find element: `#submitt`, but never found it.
```

**원인** — 가장 흔한 4가지다.
1. 셀렉터 오타 (`#submitt`)
2. 기본 타임아웃(4초)보다 요소 렌더가 느림 (API 응답 대기 등)
3. 클릭 이후 비동기로 그려지는 요소를 너무 일찍 찾음
4. 요소가 **iframe 안**에 있어 메인 문서에서는 영영 안 보임

**해결**
- 셀렉터를 개발자도구에서 먼저 검증한다. 가능하면 `data-cy` 같은 전용 속성을 쓴다.
- 진짜 느린 요소만 `{ timeout }`으로 개별 연장한다. 전역 남발 금지.
- "버튼 클릭 → 결과 노출" 흐름은 `cy.wait(ms)`가 아니라 **결과 요소에 대한 assertion**으로 기다린다(자동 재시도).
- iframe이면 13번 항목 패턴으로 접근한다.

```js
// 나쁨: 오타 + 기다림 없음
cy.get('#submitt').click()

// 좋음: 전용 셀렉터 + 느린 요소만 타임아웃 연장
cy.get('[data-cy="submit"]').click()
cy.get('[data-cy="result"]', { timeout: 10000 }) // 이 요소만 10초까지 재시도
  .should('be.visible')
```

---

### 에러/증상 2 — element is not visible / display:none / visibility:hidden

**대표 에러**
```
cy.click() failed because this element is not visible:
<button ...>...</button>
This element `<button>` is not visible because it has CSS property: `display: none`
```

**원인** — Cypress는 실제 사용자처럼 **보이는 요소에만** 액션을 한다. 요소가 DOM엔 있지만 `display:none`, `visibility:hidden`, 크기 0, 부모가 숨김 처리된 경우 액션이 거부된다. 드롭다운/탭/아코디언 안에 숨겨진 항목이 대표 사례다.

**해결**
- 정석: **먼저 그 요소를 보이게 만드는 트리거**(부모 메뉴 hover/click)를 한 뒤 액션한다.
- 가시성 검사를 의도적으로 건너뛰려면 `{ force: true }`. 단, "사용자가 실제로 못 누르는 버튼"을 강제로 누르는 건 테스트 의미를 훼손하므로 최후수단이다.
- hover로만 뜨는 메뉴는 CSS `:hover` 의존이라 Cypress가 재현하기 어렵다 → 부모를 보이게 한 뒤 자식을 직접 `.click({ force: true })`.

```js
// 정석: 메뉴를 먼저 열어 보이게 만든 뒤 클릭
cy.get('[data-cy="menu-trigger"]').click()
cy.get('[data-cy="menu-item-export"]').should('be.visible').click()

// 최후수단: 가시성 검사 무시(이유를 주석으로 남길 것)
cy.get('[data-cy="hidden-by-hover"]').click({ force: true })
```

---

### 에러/증상 3 — element is being covered by another element

**대표 에러**
```
cy.click() failed because this element is being covered by another element:
<div class="loading-overlay">...</div>
```

**원인** — 클릭하려는 좌표 위에 **다른 요소가 덮여 있다**. 로딩 스피너/오버레이, 모달 백드롭, sticky 헤더·푸터, 쿠키 배너가 주범이다. Cypress는 요소의 중심점이 다른 요소에 가려지면 클릭을 거부한다(사용자도 못 누르니까).

**해결**
- 가린 요소가 **사라질 때까지 기다린다** — 스피너에 `should('not.exist')`.
- 가린 게 배너/헤더면 먼저 닫거나(닫기 버튼 클릭) `scrollIntoView()`로 위치를 조정한다.
- 정말 가림이 정상 흐름이 아니면 `{ force: true }`로 좌표 검사를 건너뛴다.

```js
// 로딩 오버레이가 사라진 뒤에 클릭 (가장 안전)
cy.get('.loading-overlay').should('not.exist')
cy.get('[data-cy="save"]').click()

// sticky 헤더에 가릴 때
cy.get('[data-cy="row-action"]').scrollIntoView().click()
```

---

### 에러/증상 4 — element has become detached from the DOM

**대표 에러**
```
Timed out retrying: cy.click() failed because the page updated as a result of this command,
but you tried to continue the command chain against a stale element... the element has detached from the DOM.
```

**원인** — React/Vue 등이 **리렌더**하면 기존 DOM 노드를 버리고 새 노드로 교체한다. 이전에 `cy.get`으로 잡아 변수에 저장해 둔 요소는 더 이상 화면의 그 요소가 아니다(분리됨). "한 번 조회해서 여러 번 쓰기"가 대표적 안티패턴이다.

**해결** — **요소를 변수/별칭에 캐시해 재사용하지 말고, 쓸 때마다 다시 조회**한다. Cypress 명령은 매번 최신 DOM을 다시 쿼리하므로 체인을 끊지 말고 그때그때 `cy.get`하면 안전하다.

```js
// 나쁨: 결과를 저장해 두고 재사용 → 그 사이 리렌더되면 detached
cy.get('[data-cy="row"]').as('row')
cy.get('@row').click()        // 여기서 리스트가 재렌더되면
cy.get('@row').should('be.visible') // @row는 이미 분리된 옛 노드

// 좋음: 매번 다시 조회 (최신 DOM 보장)
cy.get('[data-cy="row"]').click()
cy.get('[data-cy="row"]').should('have.class', 'selected')
```

---

### 에러/증상 5 — failed because the element you are chaining off of has become detached

**대표 에러**
```
cy.type() failed because the element you are chaining off of has become detached or removed from the DOM.
```

**원인** — 4번의 **체인 버전**이다. `cy.get(...).then(...)` 안에서 얻은 요소를 기준으로 다음 명령을 거는데, 중간에 페이지가 갱신되어 그 기준 요소가 분리됐다. `.then()`으로 jQuery 요소를 꺼내 직접 조작하거나, 입력 도중 폼이 재렌더되는 경우 자주 본다.

**해결**
- `.then()`으로 요소를 꺼내 보관하지 말고 **Cypress 체인을 그대로 이어서** 작성한다.
- 재렌더를 유발하는 입력은 단계 사이에 **안정 상태를 assertion으로 확인**한 뒤 진행한다.
- 꼭 다시 잡아야 하면 `.then` 내부에서 `cy.get`으로 **재조회**한다.

```js
// 나쁨: then으로 꺼낸 요소가 그 사이 재렌더되어 detached
cy.get('[data-cy="email"]').then(($el) => {
  cy.wrap($el).type('a@b.com') // 입력 중 폼 재렌더 시 분리됨
})

// 좋음: 체인 유지 + 단계별 안정화 확인
cy.get('[data-cy="email"]').type('a@b.com')
cy.get('[data-cy="email"]').should('have.value', 'a@b.com')
cy.get('[data-cy="next"]').click()
```

---

### 에러/증상 6 — Cypress detected a cross origin error

**대표 에러**
```
Cypress detected a cross origin error happened on page load:
> Blocked a frame with origin "https://b.com" from accessing a cross-origin frame.
The new URL is considered a different origin because it does not match... <https://a.com>
```

**원인** — 테스트 도중 **다른 origin(프로토콜+도메인+포트)**으로 이동했다. 로그인 후 외부 SSO(예: 구글/소셜 로그인) 리다이렉트, 결제사 페이지 이동이 대표 사례다. 한 테스트는 기본적으로 하나의 superdomain만 다룬다.

**해결** — 다른 origin에서 할 작업을 `cy.origin('도메인', () => { ... })` 콜백 안에 넣는다. 콜백은 **격리된 컨텍스트**라 바깥 변수를 직접 못 쓰므로 필요한 값은 `{ args }`로 넘긴다. (`cypress.config`에 `experimentalSessionAndOrigin`이 필요했던 건 구버전; 13+에선 기본 제공.)

```js
cy.visit('https://a.com')
cy.get('[data-cy="login-with-idp"]').click() // https://idp.com 으로 이동

const user = { id: 'qa', pw: 'secret' }
cy.origin('https://idp.com', { args: user }, ({ id, pw }) => {
  // 이 블록 안은 idp.com 컨텍스트. 바깥 변수는 args로만 전달됨
  cy.get('#username').type(id)
  cy.get('#password').type(pw)
  cy.get('#submit').click()
})
cy.url().should('include', 'a.com/dashboard') // 원래 origin으로 복귀 확인
```

---

### 에러/증상 7 — cy.visit() failed / 동일 출처 / 4xx-5xx

**대표 에러**
```
cy.visit() failed trying to load: http://localhost:3000/
We attempted to make an http request... but got 500.
```
또는 `...we received this error: ECONNREFUSED`.

**원인**
- 서버가 안 떠 있음(`ECONNREFUSED`) 또는 잘못된 포트/경로
- 응답이 4xx/5xx — Cypress는 기본적으로 비정상 상태코드를 실패로 본다
- HTML이 아닌 응답(파일 다운로드 등)을 `visit`로 연 경우
- `baseUrl` 미설정으로 상대경로가 엉뚱한 곳을 가리킴

**해결**
- `cypress.config.js`에 `baseUrl`을 설정하면 `cy.visit('/path')`가 안정적이다.
- 의도적으로 에러 페이지를 검증할 땐 `failOnStatusCode: false`로 상태코드 실패를 끈다.
- 서버 기동을 보장하려면 `start-server-and-test` 같은 도구로 **떠 있을 때만** 테스트를 실행한다.

```js
// cypress.config.js
module.exports = { e2e: { baseUrl: 'http://localhost:3000' } }

// 테스트
cy.visit('/dashboard') // baseUrl 기준 상대경로

// 404/500 페이지 자체를 검증할 때만
cy.visit('/not-found', { failOnStatusCode: false })
cy.contains('Page not found').should('be.visible')
```

---

### 에러/증상 8 — cy 명령은 Promise 가 아니다 (async/await · .then 혼용)

**대표 증상** — 에러 메시지가 안 뜨거나, 값이 `undefined`거나, 단언이 엉뚱한 시점에 통과/실패한다. `const text = cy.get(...).text()` 같은 코드가 `undefined`를 반환.

**원인** — `cy.xxx()`는 **즉시 실행되지 않고 큐에 등록되는 명령**이다. 동기적으로 값을 반환하지 않으며 진짜 Promise도 아니라 `await`을 붙여도 의도대로 안 된다. 코드를 위에서 아래로 읽으면 "등록 순서"일 뿐, 실제 실행은 큐가 순차 처리한다.

**해결** — 명령의 **결과 값**이 필요하면 `.then()` 콜백 안에서 꺼낸다. `async/await`을 cy 명령과 섞지 않는다. 단언은 `.should()`로 표현해 자동 재시도를 활용한다.

```js
// 나쁨: 동기 반환 기대 → undefined
const txt = cy.get('[data-cy="title"]').text() // ❌ 작동 안 함

// 나쁨: cy에 await (의도대로 안 됨)
const el = await cy.get('[data-cy="title"]') // ❌

// 좋음: then 콜백으로 값 사용
cy.get('[data-cy="title"]').then(($el) => {
  const txt = $el.text() // 여기서 jQuery 요소의 값 사용
  expect(txt).to.eq('Welcome')
})

// 더 좋음: 단언은 should로 (재시도 내장)
cy.get('[data-cy="title"]').should('have.text', 'Welcome')
```

---

### 에러/증상 9 — cy.wait(ms) 고정 대기 남용

**대표 증상** — 에러는 아니지만 **느리고 불안정(flaky)**하다. `cy.wait(5000)`이 곳곳에 박혀 있고, 빠른 날엔 낭비, 느린 날엔 부족해서 실패한다.

**원인** — 고정 시간 대기는 "네트워크가 끝났다"는 **실제 신호**가 아니라 추측이다. CI 부하나 망 상태에 따라 매번 다른 결과를 낳는다.

**해결** — `cy.intercept`로 요청에 **별칭(alias)**을 걸고 `cy.wait('@alias')`로 **그 요청이 끝날 때까지** 기다린다. 응답 본문까지 검증할 수 있어 더 단단하다.

```js
// 나쁨: 추측성 고정 대기
cy.get('[data-cy="load"]').click()
cy.wait(5000) // 운에 맡기는 대기
cy.get('[data-cy="list"] li').should('have.length', 10)

// 좋음: 실제 요청 완료를 기다림
cy.intercept('GET', '/api/items*').as('getItems')
cy.get('[data-cy="load"]').click()
cy.wait('@getItems').its('response.statusCode').should('eq', 200)
cy.get('[data-cy="list"] li').should('have.length', 10)
```

---

### 에러/증상 10 — cy.get 이 여러 요소를 반환 (found N elements)

**대표 에러**
```
cy.click() can only be called on a single element. Your subject contained 5 elements.
```

**원인** — 셀렉터가 너무 느슨해 **여러 요소가 매칭**됐다. `cy.click()`, `cy.type()` 같은 액션 명령은 단일 요소에만 동작한다.

**해결**
- 우선 **셀렉터를 더 구체적으로** 만든다(가장 권장 — 의도가 명확).
- 목록에서 특정 위치를 골라야 하면 `.first()`, `.last()`, `.eq(index)`.
- 텍스트로 특정하려면 `.contains()`.

```js
// 에러: 여러 버튼 매칭
cy.get('button').click() // ❌ 5 elements

// 1) 더 구체적 셀렉터 (권장)
cy.get('[data-cy="row-3"] [data-cy="delete"]').click()

// 2) 위치로 선택
cy.get('[data-cy="row"]').eq(2).find('[data-cy="delete"]').click()
cy.get('[data-cy="row"]').first().click()

// 3) 텍스트로 선택
cy.contains('button', 'Save').click()
```

---

### 에러/증상 11 — command timeout vs assertion(retry) timeout 과 { timeout } 위치

**핵심 구분** — Cypress에는 성격이 다른 두 타임아웃이 있다.

| 종류 | 설정 키 | 기본값 | 무엇을 기다리나 |
|---|---|---|---|
| 명령(쿼리) 타임아웃 | `defaultCommandTimeout` | 4000ms | `cy.get` 등이 요소를 찾을 때까지 재시도 |
| 단언 재시도 | (위와 동일 적용) | 4000ms | `.should()` 조건이 참이 될 때까지 재시도 |
| 페이지 로드 | `pageLoadTimeout` | 60000ms | `cy.visit`/페이지 전환 완료 |
| 응답 대기 | `responseTimeout` | 30000ms | `cy.wait('@alias')` 응답 |

**`{ timeout }` 위치가 중요하다.** 옵션은 **그 옵션을 받은 명령에만** 적용된다. `cy.get`에 주면 "요소 찾기" 시간을, `.should` 직전 쿼리에 주면 "조건 만족까지 재시도" 시간을 늘린다.

```js
// 요소 찾기를 10초까지 재시도 (이 get에만 적용)
cy.get('[data-cy="slow"]', { timeout: 10000 }).should('be.visible')

// should 조건 재시도까지 길게: 앞 쿼리에 timeout을 준다
cy.get('[data-cy="counter"]', { timeout: 15000 }).should('have.text', '100')

// 전역 변경은 config에서
// cypress.config.js → e2e: { defaultCommandTimeout: 8000 }
```
> 주의: `cy.wait(@alias)`에서 응답이 안 와 타임아웃이면 `responseTimeout`을, 페이지 전환이 느리면 `pageLoadTimeout`을 봐야 한다. 무작정 `defaultCommandTimeout`만 올려도 해결되지 않는다.

---

### 에러/증상 12 — 테스트 간 상태 오염 (쿠키/스토리지)

**대표 증상** — 단독 실행은 통과하는데 **전체 실행하면 실패**한다. 앞 테스트의 로그인 세션·장바구니·`localStorage`가 남아 뒤 테스트의 시작 상태를 오염시킨다.

**원인** — Cypress 12+는 테스트마다 쿠키/스토리지를 자동 초기화하지만(test isolation), 이 옵션을 끈 경우나 `localStorage`에 의존하는 앱·세션 캐시는 여전히 새어나갈 수 있다.

**해결**
- `e2e.testIsolation: true`(기본값) 유지 — 각 테스트 전 깨끗한 상태 보장.
- 그래도 남는 게 있으면 `beforeEach`에서 명시적으로 비운다.
- 로그인은 매번 UI로 하지 말고 `cy.session()`으로 **캐시+복원**하면 빠르고 격리도 된다.

```js
beforeEach(() => {
  cy.clearCookies()
  cy.clearLocalStorage()
  // 필요 시: cy.window().then((w) => w.sessionStorage.clear())
})

// 로그인 세션은 cy.session으로 격리·재사용
beforeEach(() => {
  cy.session('qa-user', () => {
    cy.visit('/login')
    cy.get('[data-cy="id"]').type('qa')
    cy.get('[data-cy="pw"]').type('secret')
    cy.get('[data-cy="submit"]').click()
    cy.url().should('include', '/dashboard')
  })
})
```

---

### 에러/증상 13 — iframe 내부 요소를 cy.get 으로 못 찾음

**대표 증상** — iframe 안 버튼이 분명 보이는데 `cy.get`이 `never found it`으로 실패한다.

**원인** — `cy.get`은 **메인 문서**에서만 탐색한다. iframe은 별도 문서(contentDocument)라 그 경계를 넘지 못한다.

**해결** — iframe 요소를 잡고 그 `contentDocument.body`로 들어가 jQuery로 감싼 뒤 `.within()`이나 `cy.wrap()`으로 내부를 조작한다. 재사용을 위해 커스텀 커맨드로 빼두면 깔끔하다. (플러그인 `cypress-iframe`도 있지만 아래 순수 패턴으로 충분하다.)

```js
// commands.js — 재사용 커스텀 커맨드
Cypress.Commands.add('getIframeBody', (iframeSelector) => {
  // iframe 로드 완료(문서가 채워질 때)까지 재시도하며 body 반환
  return cy
    .get(iframeSelector, { timeout: 10000 })
    .its('0.contentDocument.body')
    .should('not.be.empty')   // 내부 문서가 준비될 때까지 대기
    .then(cy.wrap)            // jQuery로 감싸 일반 명령처럼 사용
})

// 테스트
cy.getIframeBody('iframe#payment').within(() => {
  cy.get('[data-cy="card-number"]').type('4242424242424242')
  cy.get('[data-cy="pay"]').click()
})
```
> 참고: iframe이 **다른 origin**이면 13번 패턴만으론 동일출처 정책에 막힌다. 그 경우 6번의 `cy.origin`을 함께 써야 한다.

---

### 마무리: flaky를 줄이는 5가지 습관

1. **셀렉터는 `data-cy` 전용 속성** — 디자인/클래스 변경에 안 깨진다.
2. **고정 `cy.wait(ms)` 대신 `intercept` + `wait('@alias')`** 또는 `should` 재시도.
3. **요소를 캐시해 재사용하지 말고 그때그때 재조회** (detached 예방).
4. **단언은 `.should()`로** — Cypress의 자동 재시도가 비동기 타이밍을 흡수.
5. **테스트는 서로 독립** — `cy.session` + `beforeEach` 초기화로 순서 의존 제거.

---

<a id="project-apply"></a>

## 20. 실전 적용 가이드 (이 템플릿 구조에 적용)

> 아래 셀렉터·헬퍼 명칭(`iframe#mainFrame`, `getMainFrame`, `enterMenu`, `[name="txtUsername"]` 등)은 이 템플릿의 iframe POM(`cypress/pages/base/IframeBasePage.js`, `cypress/e2e/module/iframe.js`, `cypress/support/commands.js`)을 기준으로 한 **예시 패턴**입니다. 세부 명칭은 대상 화면에 맞게 바꿔 쓰세요. (iframe 이 없는 일반 SPA 라면 `DomBasePage` 계열을 사용하면 됩니다.)

### 셀렉터 전략 — data-* 권장과 현재 name/id 방식

example.cypress.io 는 `cy.get('[data-cy="submit"]')` 처럼 **테스트 전용 속성(`data-cy`)** 을 권장합니다. 이유는 단순합니다. 셀렉터의 "변하는 이유"를 분리하기 위해서입니다. class/구조는 디자인 변경으로, name/id 는 서버단 로직 변경으로 흔들리지만, `data-cy` 는 "테스트를 위해 존재하는" 속성이라 의도치 않게 바뀌지 않습니다.

| 구분 | 레거시 name/id 방식 | example 권장 |
|------|---------------|--------------|
| 셀렉터 | `[name="txtUsername"]`, `#btnLogin` | `[data-cy="username"]` |
| 안정성 | 서버 로직/리뉴얼에 취약 | 테스트 전용이라 안정적 |
| 적용 난이도 | 이미 존재 → 즉시 사용 | 화면단 속성 추가 필요(개발 협조) |

레거시 화면이 많은 프로젝트는 `data-cy` 를 한 번에 깔기 어렵습니다. **점진적 개선**을 추천합니다.

1. 신규/리뉴얼되는 화면부터 개발팀에 `data-cy` 추가 요청 (가장 효과 큼)
2. 그 전까지는 `name` > `id` > `class` 순으로 우선 사용 (텍스트·nth-child·xpath 는 최후 수단)
3. 자주 깨지는 셀렉터는 POM 의 한 곳에 모아두어, 바뀌어도 한 줄만 고치게 만들기

즉 "지금 당장 name/id 가 틀린 건 아니다. 다만 새로 만드는 곳부터 data-cy 로 갈아탄다"가 현실적인 방향입니다.

### iframe 안 요소 다루기 — 왜 일반 cy.get 이 안 되는가

example 의 모든 예제는 `cy.get('.foo')` 가 **현재 페이지(top document)** 의 DOM 을 봅니다. 그런데 레거시 iframe 관리자 화면은 메뉴 진입 후 콘텐츠가 `iframe#mainFrame` **안쪽 문서**에 로드됩니다. 비유하면, Cypress 는 큰 건물(top document) 1층 로비에서 사람을 찾는데, 정작 우리가 찾는 사람은 건물 안의 **별도 사무실(iframe document)** 에 있는 셈입니다. 로비에서 아무리 둘러봐도(`cy.get`) 안 보입니다.

그래서 iframe 내부에 들어가는 헬퍼로 한 번 감싸줘야 합니다. 이 템플릿의 `getMainFrame`(`cypress/e2e/module/iframe.js`)이 그 역할입니다.

```js
// cypress/e2e/module/iframe.js (예시)
export const getMainFrame = (timeout = 10000) => {
    // iframe 엘리먼트 → 내부 document.body 로 진입한 뒤 cy.wrap 으로 재-체이닝 가능하게 변환
    return cy.get('iframe#mainFrame', { timeout })
        .its('0.contentDocument.body', { timeout })
        .should('not.be.empty')
        .then(cy.wrap);
};
```

사용할 때는 `cy.get` 대신 `getMainFrame()` 으로 시작합니다.

```js
// ❌ iframe 밖(top)만 봄 → 못 찾음
cy.get('#btnSearch').click();

// ✅ iframe 내부 body 기준으로 탐색
getMainFrame().find('#btnSearch').click();
getMainFrame().find('.panel').should('be.visible');
```

페이지가 제대로 떴는지 검사하는 `validatePage()` 도 핵심입니다. 메뉴 전환 시 iframe 이 **연속 네비게이션(이중 리다이렉트)** 하면 잡아둔 `body` 가 전환 중 detach 되어 `not attached` 에러가 납니다. 그래서 매 재시도마다 body 를 새로 조회하는 `should(callback)` 패턴으로 detach-safe 하게 만들어 둔 것이 포인트입니다.

```js
// detach-safe: should 콜백이 재시도될 때마다 contentDocument 를 새로 읽음
cy.get('iframe#mainFrame', { timeout: 20000 }).should($iframe => {
    const doc = $iframe[0].contentDocument;
    const body = doc && doc.body;
    expect(Boolean(body && body.innerHTML.length > 0), 'iframe body 로드').to.be.true;
    expect(body.querySelectorAll('.panel').length, '.panel 존재').to.be.at.least(1);
});
```

### 대기 전략 — cy.wait(ms) 를 버리고 재시도에 맡기기

flaky 의 1순위 원인은 고정 대기 `cy.wait(3000)` 입니다. 서버가 느린 날엔 3초로 부족하고, 빠른 날엔 3초를 낭비합니다. example 이 가르치는 정답은 두 가지입니다.

**(1) 네트워크 응답을 alias 로 기다리기** — 검색·조회처럼 서버 호출이 끝나야 결과가 나오는 화면에 적합합니다.

```js
// 호출 직전에 가로채기 등록 → 버튼 클릭 → 그 호출이 끝날 때까지만 대기
cy.intercept('POST', '**/Search.aspx/GetList').as('searchList');
getMainFrame().find('#btnSearch').click();
cy.wait('@searchList');                       // 정확히 응답 시점까지만 대기
getMainFrame().find('.grid tbody tr').should('have.length.at.least', 1);
```

**(2) should 의 자동 재시도에 맡기기** — `should` 는 조건이 맞을 때까지 셀렉터를 **자동 재실행**합니다(기본 4초, timeout 조정 가능). DOM 이 늦게 그려져도 알아서 기다립니다.

```js
// ❌ 임의 대기 후 단언 → 타이밍 어긋나면 실패
cy.wait(2000);
getMainFrame().find('.result').should('be.visible');

// ✅ 나타날 때까지 재시도 (긴 구간은 timeout 만 올림)
getMainFrame().find('.result', { timeout: 15000 }).should('be.visible');
```

원칙: **"몇 초 기다린다"가 아니라 "이 상태가 될 때까지 기다린다"** 로 사고를 바꾸면 flaky 가 크게 줄어듭니다. `cy.wait(ms)` 는 애니메이션 등 진짜 시간 의존 구간에만 예외적으로 씁니다.

### 커스텀 명령 & POM — 역할 분담

example 은 반복 동작을 `Cypress.Commands.add` 로 명령화하라고 안내합니다. 이 템플릿의 `cy.login`, `enterMenu` 가 그 적용 사례입니다.

```js
// cypress/support/commands.js (예시) — 로그인은 모든 spec 의 진입 의식이므로 명령화
// 이 템플릿은 셀렉터·성공판정까지 loginEnvs(cypress.env.json)에서 주입받아 사이트에 비종속이다.
Cypress.Commands.add('login', (env) => {
    const envs = Cypress.env('loginEnvs') || {};
    const name = env || Cypress.env('loginEnv') || 'local';
    const cfg = envs[name];                    // 환경별 계정/URL/셀렉터 분기
    const sel = cfg.selectors || {};
    cy.visit(cfg.url);
    cy.get(sel.username).type(cfg.username);
    cy.get(sel.password).type(cfg.password, { log: false });
    cy.get(sel.submit).click();
    if (cfg.successUrl) cy.url({ timeout: 20000 }).should('include', cfg.successUrl); // 결과 기반 판정
});
```

**역할 분담**은 이렇게 잡으면 깔끔합니다.

| 계층 | 담당 | 예시 |
|------|------|------|
| Custom Command | 화면 공통·범용 행위(앱 전체) | `cy.login()`, `enterMenu()`, `getMainFrame()` |
| Page Object | 특정 화면의 셀렉터 + 그 화면 전용 액션 | `ExampleSearchPage.search(keyword)`, `.selectors.searchBtn` |
| Spec(테스트) | 시나리오 흐름·단언만 서술 | "로그인 → 메뉴 진입 → 검색 → 결과 검증" |

```js
// Page Object (예시) — 셀렉터를 한 곳에 모아 변경에 강하게
class ExampleSearchPage {
    selectors = { search: '#searchBtn', keyword: '#searchInput', rows: 'table.result-grid tbody tr' };
    search(keyword) {
        getMainFrame().find(this.selectors.keyword).clear().type(keyword);
        getMainFrame().find(this.selectors.search).click();
    }
}

// Spec — 흐름만 읽힌다
cy.login('iframeLegacy');
enterMenu('Example', 'Search');
new ExampleSearchPage().search('TEST_KEYWORD');
```

핵심 경계선: **"어디를 누르나"(셀렉터)는 Page Object 가, "무엇을 검증하나"(단언)는 Spec 이** 책임집니다. Command 는 화면을 가리지 않는 공통 동작만 맡깁니다.

### 테스트 데이터 — fixture 와 env 로 분리

코드 안에 계정·검색어를 하드코딩하면 환경이 바뀔 때마다 코드를 고쳐야 하고, 민감정보가 git 에 박힙니다. example 의 분리 원칙을 그대로 적용합니다.

- **`cy.fixture`** : 정적 테스트 데이터(검색 케이스, 입력값 세트)를 JSON 으로 분리.

```js
// cypress/fixtures/search_cases.json
// { "valid": { "keyword": "TEST_KEYWORD", "amount": "100" } }
cy.fixture('search_cases').then(({ valid }) => {
    new ExampleSearchPage().search(valid.keyword);
});
```

- **`Cypress.env`** : 환경·계정처럼 **실행 시 달라지는 값**을 분기. 위 `cy.login` 이 `loginEnvs` / `loginEnv` 를 읽는 방식이 바로 이것입니다.

```bash
# 실행할 때 환경만 바꿔치기 — 코드 수정 불필요
npx cypress run --env loginEnv=local
npx cypress run --env loginEnv=iframeLegacy,DIAG=true
```

권장: 계정·비밀번호 같은 민감정보는 git 에 올리는 fixture 가 아니라 `cypress.env.json`(gitignore 대상) 또는 CI 의 환경변수로 주입합니다. 내부망/VPN 등 실행 전제 조건이 있으면 spec 주석/README 에 명시하세요.

### 안정성 체크리스트 — detached / not visible / timeout 줄이기

flaky 해소를 위한 실무 규칙입니다. 신규 spec 작성·리뷰 시 훑어보세요.

- **iframe 내부는 항상 `getMainFrame().find(...)` 로 시작** — top document 의 `cy.get` 으로 iframe 요소를 잡지 않는다(not found / 오매칭 방지).
- **`cy.wait(ms)` 금지, `cy.intercept + cy.wait(@alias)` 또는 `should` 재시도 사용** — 시간이 아니라 상태로 기다린다.
- **detached 방어: 페이지 전환 직후엔 잡아둔 엘리먼트를 재사용하지 말고 다시 조회** — `validatePage()` 처럼 매 재시도 body 를 새로 읽는 `should(callback)` 패턴을 따른다.
- **클릭/입력 전 `.should('be.visible')` 로 가시성 확정** — 특히 드롭다운/플라이아웃 메뉴는 `:visible` 로 scope 해 닫힌(hidden) 동명 항목 오클릭을 막는다(`#navbar-main a:visible`).
- **긴 작업 구간은 timeout 을 호출처에서 명시** — `{ timeout }` 은 쿼리→쿼리로 자동 전파되지 않으므로 `.its()`·`.find()` 에 각각 지정한다(검색·리포트 등).
- **로딩 인디케이터 사라짐을 명시적으로 대기** — `getMainFrame().find('.loading, .spinner').should('not.exist')` 로 비동기 렌더 완료를 보장한 뒤 단언한다.
- **테스트 간 상태 격리** — 로그인/쿠키 등은 매 테스트 깨끗한 상태에서 시작(`cy.login()` 을 `beforeEach` 또는 `cy.session` 으로), 이전 테스트 잔여 상태에 의존하지 않는다.

---

_출처: example.cypress.io (Cypress Kitchen Sink) · 최종 수정: 2026-06-30_
