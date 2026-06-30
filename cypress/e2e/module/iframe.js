// iframe 기반 웹앱 공용 헬퍼 — 화면이 <iframe id="mainFrame"> 안쪽에 그려지는 경우 사용.
// 일반 SPA(비-iframe) 프로젝트라면 이 파일은 필요 없다.
//
// 대상 iframe 셀렉터. 프로젝트의 iframe id 가 다르면 여기만 바꾸면 된다.
const FRAME = 'iframe#mainFrame';

// iframe 안쪽 body 취득 — find/click/type 의 출발점.
//   {timeout}은 쿼리→쿼리로 전파되지 않으므로 .its()에도 명시한다.
export const getMainFrame = (timeout = 10000) => {
    return cy.get(FRAME, { timeout }).its('0.contentDocument.body', { timeout }).should('not.be.empty').then(cy.wrap);
};

// iframe 페이지 유효성 검사 — 로딩 완료 + 흔한 서버 에러 부재 확인.
//   readySelector: "이 요소가 보이면 페이지 준비 완료"로 볼 대표 셀렉터(프로젝트에 맞게 지정, 기본 'body').
export const validatePage = (readySelector = 'body') => {
    cy.log('## [1/3] iframe 로딩 확인 ##');
    getMainFrame().should('exist');

    cy.get(FRAME, { timeout: 20000 })
        .its('0.contentDocument.body')
        .should('not.be.empty')
        .find(readySelector, { timeout: 20000 })
        .should('have.length.at.least', 1);

    cy.log('## [2/3] 서버 에러 없음 확인 ##');
    getMainFrame().should('not.contain', 'Server Error');
    getMainFrame().should('not.contain', '404 - File or directory not found');
    getMainFrame().should('not.contain', 'Page not found');

    cy.log('## [3/3] 페이지 유효성 검사 - 통과 ##');
};

// 네이티브 alert/confirm 을 Cypress(sinon) stub 으로 처리 — alert/confirm 가 테스트를 막지 않게 한다.
//   confirmReturn: confirm() 이 반환할 값 (기본 true = '확인' 누른 효과)
export const stubIframeDialogs = (confirmReturn = true) => {
    return cy
        .get(FRAME, { timeout: 10000 })
        .its('0.contentWindow')
        .then((iframeWindow) => {
            const confirmStub = Cypress.sinon.stub(iframeWindow, 'confirm').returns(confirmReturn);
            const alertStub = Cypress.sinon.stub(iframeWindow, 'alert');
            cy.wrap(confirmStub).as('confirmStub'); // 검증용 alias
            cy.wrap(alertStub).as('alertStub');
            return null;
        });
};

// [진단 헬퍼] iframe 현재 상태(URL + 본문 앞부분)를 로그 + 파일로 기록.
//   사용법: logIframeState('라벨')  /  켜기: cypress 실행 시 --env DIAG=true
export const logIframeState = (label) => {
    if (!Cypress.env('DIAG')) return; // DIAG 가 꺼져 있으면 아무 동작 안 함
    return cy.get(FRAME).then(($iframe) => {
        let info;
        try {
            const win = $iframe[0].contentWindow;
            const body = $iframe[0].contentDocument.body;
            info = '[' + label + '] URL=' + ((win && win.location) ? win.location.href : '?') +
                ' | head=' + (body ? body.textContent.replace(/\s+/g, ' ').trim().slice(0, 150) : 'null');
        } catch (e) {
            info = '[' + label + '] diag-error: ' + e.message;
        }
        cy.log(info);
        cy.writeFile('cypress/diag-log.txt', new Date().toISOString() + ' ' + info + '\n', { flag: 'a+' });
    });
};

// 상단 메뉴 진입 헬퍼 (이름으로 클릭 + cypress-real-events realHover/realClick + validatePage 캡슐화).
//   2단 메뉴: enterMenu('상위메뉴', '부모', '항목')
//   1단 메뉴: enterMenu('상위메뉴', '항목')
//   child 는 문자열 또는 정규식 (예: /^Logs$/ — 'Error Logs' 같은 부분일치 오매칭 방지)
//
//   주의: 아래 NAV 셀렉터('#navbar-main')는 예시다. 대상 사이트의 상단 네비게이션 셀렉터로 바꾸세요.
const NAV = '#navbar-main';
export const enterMenu = (topMenu, a, b) => {
    const twoLevel = b !== undefined; // 인자 3개=2단(top/parent/child), 2개=1단(top/child)
    const parent = twoLevel ? a : null;
    const item = twoLevel ? b : a;

    // 상단 토글: 이름으로 클릭 (.dropdown-toggle 로 scope 해 본문 동명 텍스트 오클릭 방지)
    cy.contains(`${NAV} .dropdown-toggle`, topMenu).click();

    if (twoLevel) {
        // 부모 realHover 로 플라이아웃 펼침 → 항목은 realClick(네이티브 클릭)으로 hover 유지하며 진입
        //   :visible 로 scope — 동명 항목이 닫힌 다른 메뉴에도 있을 때 hidden 요소 오매칭 방지
        cy.contains(`${NAV} a:visible`, parent).should('be.visible').realHover();
        cy.contains(`${NAV} a:visible`, item).should('be.visible').realClick();
    } else {
        cy.contains(`${NAV} a:visible`, item).should('be.visible').realClick();
    }

    const label = typeof item === 'string' ? item : item.toString();
    cy.log(`## 메뉴 진입: ${topMenu}${twoLevel ? ' > ' + parent : ''} > ${label} ##`);
    validatePage();
};
