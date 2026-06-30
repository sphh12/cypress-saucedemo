// 공용 헤더 컴포넌트 — 로그인 후 모든 화면 상단에 공통 노출되는 장바구니 배지/링크 + 슬라이드(버거) 메뉴.
// BasePage 를 상속하지 않고, 무상태 유지를 위해 페이지 객체의 body/waitUntil 게이트를 생성자로 주입받는다 (P4 합성).
export default class HeaderComponent {
    constructor(gate) {
        this.body = gate.body; // (timeout) => cy.get('body', ...)
        this.waitUntil = gate.waitUntil; // (assertCb, timeout) => 재시도 게이트
    }

    selectors = {
        cartBadge: '[data-test="shopping-cart-badge"]',
        cartLink: '[data-test="shopping-cart-link"]',
        burgerBtn: '#react-burger-menu-btn',
        crossBtn: '#react-burger-cross-btn',
        menuWrap: '.bm-menu-wrap',
        allItemsLink: '[data-test="inventory-sidebar-link"]',
        aboutLink: '[data-test="about-sidebar-link"]',
        logoutLink: '[data-test="logout-sidebar-link"]',
        resetLink: '[data-test="reset-sidebar-link"]',
    };

    // 장바구니 배지 수량 검증 (count=0 이면 배지 미존재 확인 — 빈 장바구니)
    verifyCartBadgeCount(count) {
        this.waitUntil((body) => {
            const badge = Cypress.$(body).find(this.selectors.cartBadge);
            if (count === 0) {
                expect(badge.length, '카트 배지 미노출(빈 장바구니)').to.equal(0);
            } else {
                expect(badge.length, '카트 배지 노출').to.be.greaterThan(0);
                expect(badge.text().trim(), '카트 담긴 수량').to.equal(String(count));
            }
        }, 10000);
        return this;
    }

    // 장바구니 화면으로 이동
    openCart() {
        this.body().find(this.selectors.cartLink).click();
        return this;
    }

    // 슬라이드 메뉴 열기 (슬라이드 애니메이션이 끝나 메뉴가 노출될 때까지 대기)
    openMenu() {
        this.body().find(this.selectors.burgerBtn).click();
        this.waitUntil((body) => {
            const wrap = Cypress.$(body).find(this.selectors.menuWrap);
            expect(wrap.length, '메뉴 래퍼 존재').to.be.greaterThan(0);
            // react-burger-menu 는 닫힘 상태에서 aria-hidden=true → 열리면 false
            expect(wrap.attr('aria-hidden'), '메뉴 열림 상태').to.not.equal('true');
        }, 20000); // 메뉴 슬라이드 전환 — W5 전환 구간 표준 20s
        return this;
    }

    // 로그아웃 → 로그인 화면 복귀
    logout() {
        this.openMenu();
        this.body().find(this.selectors.logoutLink).should('be.visible').click();
        return this;
    }

    // 앱 상태 초기화 (장바구니/필터 등 리셋)
    resetAppState() {
        this.openMenu();
        this.body().find(this.selectors.resetLink).should('be.visible').click();
        return this;
    }

    // 전체 상품 목록(All Items)으로 이동
    allItems() {
        this.openMenu();
        this.body().find(this.selectors.allItemsLink).should('be.visible').click();
        return this;
    }
}
