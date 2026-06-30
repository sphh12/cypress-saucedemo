// 일반 SPA(React/Vue 등, iframe 없음)용 베이스 — 화면 내용이 일반 DOM 에 직접 그려지는 경우.
// 공통 규칙은 AbstractBasePage 에서 물려받고, "일반 DOM body 에 닿는 법"만 여기서 채운다.
import AbstractBasePage from './AbstractBasePage';

export default class DomBasePage extends AbstractBasePage {
    // 동작용 body — 일반 문서 body 를 매 호출 재취득
    body(timeout) {
        return cy.get('body', { timeout });
    }

    // 대기/검증 게이트 — body 를 매 재시도 재조회하여 콜백에 전달
    waitUntil(assertCb, timeout = 60000) {
        return cy.get('body', { timeout }).should(($body) => {
            assertCb($body[0]);
        });
    }

    // 화면 이동 — 라우팅 후 기대 텍스트 등장까지 대기 (expectText 생략 가능)
    goTo(url, expectText, timeout = 20000) {
        cy.visit(url);
        if (expectText) {
            this.waitUntil((body) => {
                expect(body.textContent, '화면 로드').to.include(expectText);
            }, timeout);
        }
        return this;
    }
}
