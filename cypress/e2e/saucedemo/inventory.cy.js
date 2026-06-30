import InventoryPage from '../../pages/dom/InventoryPage';

describe('[saucedemo] 인벤토리', () => {
    // 표준 유저로 로그인 → /inventory.html 진입
    beforeEach(() => {
        cy.login('local');
    });

    it('상품이 6개 노출된다', () => {
        // 인벤토리 로드 후 상품 개수 검증
        InventoryPage.verifyLoaded().verifyProductCount(6);
    });

    it('이름 오름차순(A to Z)으로 정렬된다', () => {
        // A→Z 정렬 적용 후 결과 검증
        InventoryPage.verifyLoaded().sortBy('az').verifySortedBy('az');
    });

    it('이름 내림차순(Z to A)으로 정렬된다', () => {
        // Z→A 정렬 적용 후 결과 검증
        InventoryPage.verifyLoaded().sortBy('za').verifySortedBy('za');
    });

    it('가격 오름차순(low to high)으로 정렬된다', () => {
        // 가격 낮은순 정렬 적용 후 결과 검증
        InventoryPage.verifyLoaded().sortBy('lohi').verifySortedBy('lohi');
    });

    it('가격 내림차순(high to low)으로 정렬된다', () => {
        // 가격 높은순 정렬 적용 후 결과 검증
        InventoryPage.verifyLoaded().sortBy('hilo').verifySortedBy('hilo');
    });

    it('여러 상품을 담으면 카트 배지 수량이 증가한다', () => {
        // 두 개 상품을 담아 배지 수량이 2가 되는지 검증
        InventoryPage.verifyLoaded()
            .addItemToCart('sauce-labs-backpack')
            .addItemToCart('sauce-labs-bike-light')
            .verifyCartBadgeCount(2);
    });

    it('담은 상품을 인벤토리에서 제거하면 배지 수량이 감소한다', () => {
        // 두 개 담은 뒤 하나를 제거하면 배지 수량이 1로 줄어드는지 검증
        InventoryPage.verifyLoaded()
            .addItemToCart('sauce-labs-backpack')
            .addItemToCart('sauce-labs-bike-light')
            .verifyCartBadgeCount(2)
            .removeItemFromCart('sauce-labs-backpack')
            .verifyCartBadgeCount(1);
    });
});
