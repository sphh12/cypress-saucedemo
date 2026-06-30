import DomBasePage from '../base/DomBasePage';

// 상품 상세 페이지 객체 — saucedemo /inventory-item.html
// 주의: 상세 페이지의 담기/제거 버튼은 목록과 달리 정적 셀렉터(add-to-cart / remove)다.
class ProductDetailPage extends DomBasePage {
    selectors = {
        name: '[data-test="inventory-item-name"]',
        desc: '[data-test="inventory-item-desc"]',
        price: '[data-test="inventory-item-price"]',
        addToCart: '[data-test="add-to-cart"]',
        removeFromCart: '[data-test="remove"]',
        backToProducts: '[data-test="back-to-products"]',
    };

    // 상세 화면 로드 검증
    verifyLoaded() {
        cy.url({ timeout: 20000 }).should('include', '/inventory-item.html');
        this.waitUntil((body) => {
            expect(Cypress.$(body).find(this.selectors.name).length, '상세 상품명 존재').to.be.greaterThan(0);
        }, 20000);
        return this;
    }

    // 상세 상품명 검증
    verifyProductName(expectedName) {
        this.waitUntil((body) => {
            expect(Cypress.$(body).find(this.selectors.name).text().trim(), '상세 상품명').to.equal(expectedName);
        }, 10000);
        return this;
    }

    // 상세에서 장바구니 담기
    addToCart() {
        this.body().find(this.selectors.addToCart).click();
        return this;
    }

    // 담김 검증 (Remove 버튼 노출)
    verifyAddedToCart() {
        this.waitUntil((body) => {
            expect(Cypress.$(body).find(this.selectors.removeFromCart).length, '상세 Remove 버튼 노출').to.be.greaterThan(0);
        }, 10000);
        return this;
    }

    // 상품 목록으로 복귀
    backToProducts() {
        this.body().find(this.selectors.backToProducts).click();
        return this;
    }
}

export default new ProductDetailPage(); // 무상태 싱글톤
