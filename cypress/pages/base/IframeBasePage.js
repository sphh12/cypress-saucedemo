// iframe 기반 레거시 웹앱용 베이스 — 화면 내용이 <iframe id="mainFrame"> 안쪽에 그려지는 경우.
// 공통 규칙은 AbstractBasePage 에서 물려받고, "iframe 안쪽 body 에 닿는 법"만 여기서 채운다.
import AbstractBasePage from './AbstractBasePage';
import { getMainFrame, validatePage } from '../../e2e/module/iframe';

export default class IframeBasePage extends AbstractBasePage {
    // 동작용 body — iframe 안쪽 body 를 매 호출 재취득 (postback 후 stale 방지)
    body(timeout) {
        return getMainFrame(timeout);
    }

    // 대기/검증 게이트 — iframe 부터 매 재시도 재조회하여 "신선한 body" 를 콜백에 전달
    waitUntil(assertCb, timeout = 60000) {
        return cy.get('iframe#mainFrame', { timeout }).should(($iframe) => {
            const body = $iframe[0].contentDocument && $iframe[0].contentDocument.body;
            expect(body, 'iframe body').to.not.be.empty;
            assertCb(body);
        });
    }

    // iframe 페이지 유효성 검사 위임 (module/iframe.js)
    validate() {
        validatePage();
        return this;
    }

    // 같은 페이지 내 탭/화면 전환 — iframe.src 를 직접 교체한 뒤 "신선한 문서" 대기.
    //   expectText 는 전환 이후에만 존재하는 텍스트여야 옛 문서 오탐을 막는다.
    goToFrameUrl(url, expectText, timeout = 20000) {
        cy.get('iframe#mainFrame').then(($iframe) => {
            $iframe[0].src = url; // postback 이 아닌 src 교체 → 내부 body 통째 교체
        });
        this.waitUntil((body) => {
            expect(body.textContent, '화면 전환 로드').to.include(expectText);
        }, timeout);
        return this;
    }
}
