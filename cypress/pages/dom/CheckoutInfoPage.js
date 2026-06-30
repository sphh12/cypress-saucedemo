import DomBasePage from '../base/DomBasePage';

// 체크아웃 1단계 — 배송 정보 입력 페이지 객체 — saucedemo /checkout-step-one.html
class CheckoutInfoPage extends DomBasePage {
    selectors = {
        title: '[data-test="title"]',
        firstName: '[data-test="firstName"]',
        lastName: '[data-test="lastName"]',
        postalCode: '[data-test="postalCode"]',
        continueBtn: '[data-test="continue"]',
        cancelBtn: '[data-test="cancel"]',
        error: '[data-test="error"]',
    };

    // 체크아웃 1단계 화면 로드 검증
    verifyLoaded() {
        cy.url({ timeout: 20000 }).should('include', '/checkout-step-one.html');
        this.waitUntil((body) => {
            expect(body.textContent, '체크아웃 1단계 타이틀').to.include('Checkout: Your Information');
        }, 20000);
        return this;
    }

    // 배송 정보 입력 (빈 값이면 입력 없이 비워둔다 — 필수입력 검증 케이스 지원. type('') 은 Cypress 에서 에러)
    fillShippingInfo(firstName, lastName, postalCode) {
        const fill = (selector, value) => {
            const field = this.body().find(selector).clear();
            if (value) field.type(value).should('have.value', value); // 입력 직후 값 동기화 게이트
        };
        fill(this.selectors.firstName, firstName);
        fill(this.selectors.lastName, lastName);
        fill(this.selectors.postalCode, postalCode);
        return this;
    }

    // 다음 단계(주문 요약)로 진행
    submitInfo() {
        this.body().find(this.selectors.continueBtn).click();
        return this;
    }

    // 입력 취소 → 장바구니로 복귀
    cancel() {
        this.body().find(this.selectors.cancelBtn).click();
        return this;
    }

    // 입력 누락 등 에러 메시지 검증 (음성 케이스용)
    verifyError(expectedText) {
        this.waitUntil((body) => {
            const error = Cypress.$(body).find(this.selectors.error);
            expect(error.length, '에러 메시지 노출').to.be.greaterThan(0);
            expect(error.text(), '에러 메시지 내용').to.include(expectedText);
        }, 10000);
        return this;
    }
}

export default new CheckoutInfoPage(); // 무상태 싱글톤
