import DomBasePage from '../base/DomBasePage';

// 체크아웃 완료 페이지 객체 — saucedemo /checkout-complete.html
class CheckoutCompletePage extends DomBasePage {
    selectors = {
        title: '[data-test="title"]',
        completeHeader: '[data-test="complete-header"]', // "Thank you for your order!"
        completeText: '[data-test="complete-text"]',
        backHomeBtn: '[data-test="back-to-products"]',
        ponyExpress: '[data-test="pony-express"]',
    };

    // 주문 완료 화면 로드 검증
    verifyLoaded() {
        cy.url({ timeout: 20000 }).should('include', '/checkout-complete.html');
        this.waitUntil((body) => {
            expect(body.textContent, '주문 완료 타이틀').to.include('Checkout: Complete!');
        }, 20000);
        return this;
    }

    // 주문 완료 메시지 검증
    verifyOrderComplete() {
        this.waitUntil((body) => {
            const header = Cypress.$(body).find(this.selectors.completeHeader).text().trim();
            expect(header, '주문 완료 헤더').to.equal('Thank you for your order!');
        }, 10000);
        cy.log('## 주문 완료 확인 ##');
        return this;
    }

    // 홈(상품 목록)으로 돌아가기
    backHome() {
        this.body().find(this.selectors.backHomeBtn).click();
        return this;
    }
}

export default new CheckoutCompletePage(); // 무상태 싱글톤
