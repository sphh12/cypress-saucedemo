import DomBasePage from '../base/DomBasePage';
import HeaderComponent from '../components/HeaderComponent';

// 인벤토리(상품 목록) 페이지 객체 — saucedemo /inventory.html
class InventoryPage extends DomBasePage {
    selectors = {
        title: '[data-test="title"]',
        inventoryList: '[data-test="inventory-list"]',
        item: '[data-test="inventory-item"]',
        itemName: '[data-test="inventory-item-name"]',
        itemPrice: '[data-test="inventory-item-price"]',
        sortContainer: '[data-test="product-sort-container"]',
        // 상품별 담기/제거 버튼은 상품명 slug 기반 동적 셀렉터 (예: add-to-cart-sauce-labs-backpack)
        addToCart: (slug) => `[data-test="add-to-cart-${slug}"]`,
        removeFromCart: (slug) => `[data-test="remove-${slug}"]`,
    };

    // 공용 헤더(장바구니 배지/링크 + 버거 메뉴) 합성 — 무상태 게이트 주입 (P4)
    header = new HeaderComponent({
        body: (t) => this.body(t),
        waitUntil: (cb, t) => this.waitUntil(cb, t),
    });

    // 인벤토리 화면 로드 검증 (URL + 타이틀 + 상품 존재)
    verifyLoaded() {
        cy.url({ timeout: 20000 }).should('include', '/inventory.html');
        this.waitUntil((body) => {
            expect(body.textContent, '상품 목록 타이틀').to.include('Products');
            expect(Cypress.$(body).find(this.selectors.item).length, '상품 개수').to.be.greaterThan(0);
        }, 20000);
        return this;
    }

    // 상품 개수 검증
    verifyProductCount(count) {
        this.waitUntil((body) => {
            expect(Cypress.$(body).find(this.selectors.item).length, '상품 개수').to.equal(count);
        }, 10000);
        return this;
    }

    // 특정 상품을 장바구니에 담는다 (slug = 상품명 기반 data-test 값)
    // 액션은 담기 클릭만 수행하고, 담김 검증은 verifyCartBadgeCount 등 전용 검증 메서드에 위임한다 (P8: 표본 search() 패턴 일치)
    addItemToCart(slug) {
        this.body().find(this.selectors.addToCart(slug)).click();
        cy.log(`## 장바구니 담기: ${slug} ##`);
        return this;
    }

    // 인벤토리에서 담긴 상품 제거
    removeItemFromCart(slug) {
        this.body().find(this.selectors.removeFromCart(slug)).click();
        return this;
    }

    // 카트 배지(담긴 수량) 검증 — 헤더 컴포넌트에 위임
    verifyCartBadgeCount(count) {
        this.header.verifyCartBadgeCount(count);
        return this;
    }

    // 정렬 적용 (az / za / lohi / hilo)
    sortBy(value) {
        this.body().find(this.selectors.sortContainer).select(value);
        return this;
    }

    // 정렬 결과 검증 (이름 오름/내림차순 또는 가격 오름/내림차순)
    verifySortedBy(value) {
        this.waitUntil((body) => {
            if (value === 'az' || value === 'za') {
                const names = Cypress.$(body)
                    .find(this.selectors.itemName)
                    .toArray()
                    .map((el) => el.textContent.trim());
                const expected = [...names].sort();
                if (value === 'za') expected.reverse();
                expect(names, `이름 정렬 결과(${value})`).to.deep.equal(expected);
            } else {
                const prices = Cypress.$(body)
                    .find(this.selectors.itemPrice)
                    .toArray()
                    .map((el) => parseFloat(el.textContent.replace('$', '')));
                const expected = [...prices].sort((a, b) => a - b);
                if (value === 'hilo') expected.reverse();
                expect(prices, `가격 정렬 결과(${value})`).to.deep.equal(expected);
            }
        }, 10000);
        return this;
    }

    // 상품명으로 상세 화면 진입
    openProductByName(productName) {
        this.body().contains(this.selectors.itemName, productName).click();
        return this;
    }

    // 카트 화면으로 이동 (헤더 위임)
    goToCart() {
        this.header.openCart();
        return this;
    }

    // 로그아웃 (헤더 위임)
    logout() {
        this.header.logout();
        return this;
    }

    // 앱 상태 초기화 (헤더 위임)
    resetAppState() {
        this.header.resetAppState();
        return this;
    }
}

export default new InventoryPage(); // 무상태 싱글톤
