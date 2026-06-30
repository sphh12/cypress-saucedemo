import DomBasePage from '../base/DomBasePage';

// 체크아웃 2단계 — 주문 요약 페이지 객체 — saucedemo /checkout-step-two.html
class CheckoutOverviewPage extends DomBasePage {
    selectors = {
        title: '[data-test="title"]',
        cartItem: '[data-test="inventory-item"]',
        itemName: '[data-test="inventory-item-name"]',
        subtotal: '[data-test="subtotal-label"]', // 예: "Item total: $29.99"
        tax: '[data-test="tax-label"]', // 예: "Tax: $2.40"
        total: '[data-test="total-label"]', // 예: "Total: $32.39"
        finishBtn: '[data-test="finish"]',
        cancelBtn: '[data-test="cancel"]',
    };

    // 체크아웃 2단계 화면 로드 검증
    verifyLoaded() {
        cy.url({ timeout: 20000 }).should('include', '/checkout-step-two.html');
        this.waitUntil((body) => {
            expect(body.textContent, '주문 요약 타이틀').to.include('Checkout: Overview');
        }, 20000);
        return this;
    }

    // 특정 상품이 주문 요약에 포함됐는지 검증
    verifyItemPresent(productName) {
        this.waitUntil((body) => {
            const names = Cypress.$(body)
                .find(this.selectors.itemName)
                .toArray()
                .map((el) => el.textContent.trim());
            expect(names, '주문 요약 상품 목록').to.include(productName);
        }, 10000);
        return this;
    }

    // 주문 요약에 포함된 상품 개수 검증
    verifyItemCount(count) {
        this.waitUntil((body) => {
            expect(Cypress.$(body).find(this.selectors.cartItem).length, '주문 요약 상품 수').to.equal(count);
        }, 10000);
        return this;
    }

    // 합계 금액 일관성 검증 (소계 + 세금 = 총액)
    verifyTotalsConsistent() {
        this.waitUntil((body) => {
            // 라벨 텍스트에서 "$00.00" 형태의 금액을 파싱
            const parseAmount = (sel, label) => {
                const txt = Cypress.$(body).find(sel).text();
                const match = txt.match(/\$([0-9]+\.[0-9]{2})/);
                expect(match, `${label} 금액 파싱`).to.not.be.null;
                return parseFloat(match[1]);
            };
            const subtotal = parseAmount(this.selectors.subtotal, '소계');
            const tax = parseAmount(this.selectors.tax, '세금');
            const total = parseAmount(this.selectors.total, '총액');
            // 부동소수 오차를 감안해 1센트 미만 차이는 허용
            expect(Math.abs(subtotal + tax - total), '소계+세금 = 총액').to.be.lessThan(0.01);
        }, 10000);
        return this;
    }

    // 주문 확정
    finish() {
        this.body().find(this.selectors.finishBtn).click();
        return this;
    }
}

export default new CheckoutOverviewPage(); // 무상태 싱글톤
