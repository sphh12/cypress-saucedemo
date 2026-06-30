# Cypress로 브라우저 Alert 자동 처리하기 - 가이드

## 📌 개요

Cypress E2E 테스트에서 브라우저 네이티브 Alert/Confirm 팝업을 자동으로 처리하는 방법을 다룹니다.
이 템플릿은 **Cypress sinon stub 방식(`stubIframeDialogs`)** 을 권장 방법으로 사용합니다.

### 대상 환경
- **프레임워크**: Cypress E2E 테스트
- **환경**: iframe 내부에 로드되는 레거시 웹 애플리케이션 (예: `https://legacy.example.com`)
- **문제**: 브라우저 네이티브 Alert/Confirm 팝업 자동 처리

> 💡 일반 SPA(같은 origin, iframe 없음)에서는 Cypress가 기본 제공하는 `cy.on('window:confirm', ...)` / `cy.on('window:alert', ...)` 로 충분합니다. 이 가이드는 **iframe 내부 레거시 페이지**처럼 직접 window 핸들러 등록이 까다로운 경우에 초점을 둡니다.

---

## 🎯 권장 방법: Cypress Sinon Stub

### 핵심 아이디어
- iframe의 `contentWindow`에 직접 접근하여 `confirm`/`alert` 함수를 **sinon stub**으로 교체합니다.
- stub은 실제 팝업을 띄우지 않고, 미리 정한 반환값(`confirm`)을 돌려주거나 호출 사실만 기록합니다.
- alias로 저장해 두면 **"어떤 메시지로 호출됐는지"** 까지 검증할 수 있습니다.

### 언제 사용 가능한가?
다음 조건을 **모두** 만족하면 stub 방식이 동작합니다.
- 버튼 클릭 후 페이지 reload가 **없음** (AJAX 호출 또는 Modal 방식)
- Alert/Confirm이 **현재 페이지**에서 발생
- iframe의 window 객체가 유지됨 (reload 시 stub이 무효화되므로)

### 왜 작동하는가?

```
1. 버튼 클릭
   ↓
2. AJAX 호출 (백그라운드 처리)
   ↓
3. Confirm/Alert 팝업 발생
   ↓ (페이지는 그대로!)
4. Stub이 여전히 유효 ✅
```

**핵심**: 페이지가 reload되지 않으므로 iframe의 window 객체가 유지되고, stub도 계속 작동합니다.

---

## 🛠 구현 코드

### 1. Helper 함수

POM의 iframe 베이스 페이지(`cypress/pages/base/IframeBasePage.js`)나 별도 헬퍼 모듈에 둘 수 있습니다.

```javascript
// iframe의 body에 접근하는 헬퍼
export const getMainFrame = () => {
  return cy
    .get('iframe#mainFrame', { timeout: 10000 })
    .its('0.contentDocument.body')
    .should('not.be.empty')
    .then(cy.wrap);
};

// iframe의 alert/confirm을 Stub으로 대체
export const stubIframeDialogs = (confirmReturn = true) => {
  return cy
    .get('iframe#mainFrame', { timeout: 10000 })
    .its('0.contentWindow')
    .then((iframeWindow) => {
      // Sinon stub 생성
      const confirmStub = Cypress.sinon.stub(iframeWindow, 'confirm').returns(confirmReturn);
      const alertStub = Cypress.sinon.stub(iframeWindow, 'alert');

      // alias로 저장 (검증용)
      cy.wrap(confirmStub).as('confirmStub');
      cy.wrap(alertStub).as('alertStub');

      // 디버깅용 로그
      console.log('[stubIframeDialogs] confirm/alert stub 등록 완료, confirmReturn =', confirmReturn);

      return null;
    });
};
```

### 2. 테스트 코드 (예시: 항목 승인 - Confirm → Alert)

```javascript
import { getMainFrame, stubIframeDialogs } from '../../pages/base/IframeBasePage';

it('항목 승인 - Approve (Confirm → Alert)', function () {
    // ... 로그인 및 페이지 진입 (cy.login('iframeLegacy')) ...

    // 검색
    getMainFrame().find('[name="grdItem_createdBy"]').type(TEST_USER);
    getMainFrame().find('[Value="Filter"]').click({ force: true });

    getMainFrame().find('[title="View and Approve"]').click({ force: true });
    cy.wait(2000);

    // 입력 값 작성
    getMainFrame().find('#txtRemark').type('qa test - automation');
    getMainFrame().find('#remarks1').type('qa test');

    // ⭐ Stub 설정 - Approve 버튼 클릭 "전"에 호출
    stubIframeDialogs(true);

    // Approve 버튼 클릭
    getMainFrame().find('#btnApprove').click({ force: true });

    // 메시지 검증
    cy.get('@confirmStub').should('have.been.calledWith',
        'Are you sure you want to approve this item?');
    cy.get('@alertStub').should('have.been.calledWith',
        'Successfully approved.');

    cy.log('✅ Approve 성공!');
});
```

### 3. 핵심 포인트 - 순서가 중요

```javascript
✅ 올바른 순서:
stubIframeDialogs(true);              // 1. Stub 설정
getMainFrame().find('#btn').click();  // 2. 버튼 클릭
cy.get('@alertStub').should(...);     // 3. 검증

❌ 잘못된 순서:
getMainFrame().find('#btn').click();  // 버튼 먼저 클릭
stubIframeDialogs(true);              // Stub 설정 (이미 늦음!)
```

**중요**: stub은 반드시 Alert/Confirm이 발생하기 **전**에 설정해야 합니다.

---

## 🧪 Cypress 로그 (성공 시)

```
73. get iframe#mainFrame
74. its 0.contentWindow
75. wrap function(){} @confirmStub
76. wrap function(){} @alertStub
77. get iframe#mainFrame
78. its 0.contentDocument.body
...
82. find #btnApprove
83. click {force: true}
84. (xhr) POST 200 /Approve  ← AJAX 완료
85. get @confirmStub
86. assert expected confirm to have been called... ✅
87. get @alertStub
88. assert expected alert to have been called... ✅
```

**특징**:
- XHR 요청이 정상 완료됨 (페이지 reload 없음)
- stub이 호출됨을 검증

---

## 💡 응용 사례

### Confirm에서 취소(Cancel) 클릭

```javascript
// Confirm에서 false 반환 (취소 클릭)
stubIframeDialogs(false);
getMainFrame().find('#deleteBtn').click();

cy.get('@confirmStub').should('have.been.calledOnce');
// 후속 동작(삭제)이 취소되어야 함을 검증
```

### Alert 메시지 내용 검증

```javascript
stubIframeDialogs(true);
getMainFrame().find('#saveBtn').click();

cy.get('@alertStub').should('have.been.calledWith', 'Saved successfully.');
```

---

## 🔍 디버깅 팁

### 문제: Stub이 호출되지 않음

```javascript
// 디버깅 코드 추가
stubIframeDialogs(true);

cy.get('@confirmStub').then((stub) => {
    cy.log('Confirm stub:', stub);
    console.log('[debug] confirmStub called:', stub.called);
});
cy.get('@alertStub').then((stub) => {
    cy.log('Alert stub:', stub);
    console.log('[debug] alertStub called:', stub.called);
});

getMainFrame().find('#btnApprove').click({ force: true });
```

### 문제: "cy.get() could not find alias @alertStub"
- **원인**: `stubIframeDialogs()` 호출 전에 버튼을 클릭함
- **해결**: `stubIframeDialogs()`를 버튼 클릭 **전**에 호출

### 문제: Stub이 있지만 실제 Alert이 표시됨
- **원인**: 버튼 클릭 시 페이지 reload(Form submit, 새 페이지 이동) 발생 → stub 무효화
- **해결**:
  1. 가능하면 AJAX 방식으로 처리되는 버튼/경로를 사용
  2. 부득이하게 reload가 일어난다면, reload 직후 다시 `stubIframeDialogs()`를 호출하거나 테스트 흐름을 분리

---

## ⚠️ 주의사항

- iframe이 아닌 main window의 Alert은 Cypress의 `cy.on('window:alert', ...)` / `cy.on('window:confirm', ...)` 핸들러를 사용하세요.
- Cross-origin iframe에서는 `contentWindow` 접근이 막혀 stub이 동작하지 않을 수 있습니다.
- 페이지 reload가 발생하면 stub은 무효화됩니다. 클릭 동작이 Form submit인지 AJAX인지 먼저 확인하세요.

---

## 📎 참고: OS 레벨 우회 (권장하지 않음)

페이지 reload(Form submit) 후 새 페이지에서 네이티브 Alert이 떠서 모든 JavaScript 실행이 차단되는 경우, 이론적으로는 **OS 레벨 자동화 도구**(예: `pyautogui`, `xdotool`)로 Enter 키를 눌러 우회할 수 있습니다.

다만 이 방식은 다음 이유로 **이 템플릿에서는 제거**했으며 권장하지 않습니다.

- 외부 의존성(Python 등)과 OS별 분기가 필요해 유지보수가 어려움
- 타이밍에 매우 민감하고, 테스트 실행 중 다른 창을 건드리면 실패
- CI/CD(특히 headless) 환경에서 권한·디스플레이 설정이 까다로움
- 테스트가 OS·창 포커스 상태에 의존하게 되어 안정성이 떨어짐

→ 가능하면 **버튼 동작을 AJAX 방식으로 유도**하거나, **흐름을 분리**해서 stub 방식으로 처리하는 것을 우선하세요. 그래도 어렵다면 Playwright 등 네이티브 dialog 처리가 더 나은 도구로의 부분 이관을 검토하는 편이 OS 우회보다 낫습니다.

---

## 📝 참고 자료

### 관련 파일 (이 템플릿 기준)
- `cypress/pages/base/IframeBasePage.js` - iframe 베이스 페이지 / dialog stub 헬퍼
- `cypress/e2e/sample/sample.iframe.cy.js` - iframe 레거시 샘플 스펙
- `cypress/support/commands.js` - `cy.login`, `Cypress.getDate` 등 커스텀 커맨드

### 라이브러리 문서
- [Cypress Stub API](https://docs.cypress.io/api/commands/stub)
- [Cypress catalog of events (window:alert / window:confirm)](https://docs.cypress.io/api/cypress-api/catalog-of-events)
- [Sinon Stubs](https://sinonjs.org/releases/latest/stubs/)

---

## ✅ 체크리스트 (Stub 방식 사용 전)
- [ ] 버튼 클릭 후 페이지 reload가 없는지 확인 (AJAX/Modal 여부)
- [ ] Alert/Confirm이 현재 페이지에서 발생하는지 확인
- [ ] `stubIframeDialogs()`를 버튼 클릭 **전**에 호출
- [ ] `@alertStub`, `@confirmStub` alias 검증 추가
- [ ] iframe이 cross-origin이 아닌지 확인
