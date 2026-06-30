import InventoryPage from '../../pages/dom/InventoryPage';
import CartPage from '../../pages/dom/CartPage';
import CheckoutInfoPage from '../../pages/dom/CheckoutInfoPage';
import CheckoutOverviewPage from '../../pages/dom/CheckoutOverviewPage';
import CheckoutCompletePage from '../../pages/dom/CheckoutCompletePage';

// saucedemo 핵심 구매 플로우 (기본 플로우)
describe('[saucedemo] 기본 구매 플로우', () => {
    // 테스트 대상 상품 (인벤토리 data-test slug 기준)
    const product = { slug: 'sauce-labs-backpack', name: 'Sauce Labs Backpack' };
    let testdata;

    beforeEach(() => {
        testdata = Cypress.env('testdata'); // cypress.env.json 의 배송 더미 데이터
        cy.login('local'); // standard_user 로그인 → 인벤토리 진입
    });

    it('상품을 장바구니에 담고 배송정보 입력 후 주문을 완료한다', () => {
        // 1) 인벤토리: 상품 담기 + 배지 확인 → 카트 이동
        InventoryPage.verifyLoaded()
            .addItemToCart(product.slug)
            .verifyCartBadgeCount(1)
            .goToCart();

        // 2) 카트: 담은 상품/개수 확인 → 체크아웃
        CartPage.verifyLoaded().verifyItemPresent(product.name).verifyItemCount(1).checkout();

        // 3) 체크아웃 1단계: 배송 정보 입력 → 다음
        CheckoutInfoPage.verifyLoaded()
            .fillShippingInfo(testdata.firstName, testdata.lastName, testdata.postalCode)
            .submitInfo();

        // 4) 체크아웃 2단계: 상품/금액 일관성 확인 → 주문 확정
        CheckoutOverviewPage.verifyLoaded().verifyItemPresent(product.name).verifyTotalsConsistent().finish();

        // 5) 완료: 주문 완료 메시지 확인
        CheckoutCompletePage.verifyLoaded().verifyOrderComplete();
    });
});
