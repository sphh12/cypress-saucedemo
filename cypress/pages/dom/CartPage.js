import DomBasePage from '../base/DomBasePage';

// 장바구니 페이지 객체 — saucedemo /cart.html
class CartPage extends DomBasePage {
    selectors = {
        title: '[data-test="title"]',
        cartList: '[data-test="cart-list"]',
        cartItem: '[data-test="inventory-item"]',
        itemName: '[data-test="inventory-item-name"]',
        itemQuantity: '[data-test="item-quantity"]',
        continueShopping: '[data-test="continue-shopping"]',
        checkoutBtn: '[data-test="checkout"]',
        removeFromCart: (slug) => `[data-test="remove-${slug}"]`,
    };

    // 장바구니 화면 로드 검증
    verifyLoaded() {
        cy.url({ timeout: 20000 }).should('include', '/cart.html');
        this.waitUntil((body) => {
            expect(body.textContent, '장바구니 타이틀').to.include('Your Cart');
        }, 20000);
        return this;
    }

    // 특정 상품이 장바구니에 담겨 있는지 검증
    verifyItemPresent(productName) {
        this.waitUntil((body) => {
            const names = Cypress.$(body)
                .find(this.selectors.itemName)
                .toArray()
                .map((el) => el.textContent.trim());
            expect(names, '장바구니 상품 목록').to.include(productName);
        }, 10000);
        return this;
    }

    // 장바구니에 담긴 상품 개수 검증
    verifyItemCount(count) {
        this.waitUntil((body) => {
            expect(Cypress.$(body).find(this.selectors.cartItem).length, '장바구니 상품 수').to.equal(count);
        }, 10000);
        return this;
    }

    // 장바구니에서 특정 상품 제거
    removeItem(slug) {
        this.body().find(this.selectors.removeFromCart(slug)).click();
        return this;
    }

    // 쇼핑 계속하기 → 인벤토리로 복귀
    continueShopping() {
        this.body().find(this.selectors.continueShopping).click();
        return this;
    }

    // 체크아웃 진행
    checkout() {
        this.body().find(this.selectors.checkoutBtn).click();
        return this;
    }
}

export default new CartPage(); // 무상태 싱글톤
