import InventoryPage from '../../pages/dom/InventoryPage';
import CartPage from '../../pages/dom/CartPage';
import CheckoutInfoPage from '../../pages/dom/CheckoutInfoPage';

// saucedemo 장바구니 기능 검증
describe('[saucedemo] 장바구니', () => {
    beforeEach(() => {
        cy.login('local'); // standard_user 로그인 → 인벤토리 진입
    });

    it('담은 여러 상품이 장바구니에 표시된다', () => {
        // 상품 두 개 담고 카트로 이동
        InventoryPage.verifyLoaded()
            .addItemToCart('sauce-labs-backpack')
            .addItemToCart('sauce-labs-bike-light')
            .goToCart();

        // 카트에 두 상품이 모두 표시되는지 확인
        CartPage.verifyLoaded()
            .verifyItemCount(2)
            .verifyItemPresent('Sauce Labs Backpack')
            .verifyItemPresent('Sauce Labs Bike Light');
    });

    it('장바구니에서 상품을 제거하면 개수가 줄어든다', () => {
        // 상품 두 개 담고 카트로 이동
        InventoryPage.verifyLoaded()
            .addItemToCart('sauce-labs-backpack')
            .addItemToCart('sauce-labs-bike-light')
            .goToCart();

        // 한 상품 제거 후 개수 감소 확인
        CartPage.verifyLoaded().verifyItemCount(2).removeItem('sauce-labs-backpack').verifyItemCount(1);
    });

    it('쇼핑 계속하기를 누르면 인벤토리로 돌아간다', () => {
        // 상품 담고 카트로 이동
        InventoryPage.verifyLoaded().addItemToCart('sauce-labs-backpack').goToCart();

        // 쇼핑 계속하기 클릭
        CartPage.verifyLoaded().continueShopping();

        // 인벤토리로 복귀 확인
        InventoryPage.verifyLoaded();
    });

    it('체크아웃을 누르면 배송정보 화면으로 진입한다', () => {
        // 상품 담고 카트로 이동
        InventoryPage.verifyLoaded().addItemToCart('sauce-labs-backpack').goToCart();

        // 체크아웃 진입
        CartPage.verifyLoaded().checkout();

        // 체크아웃 1단계(배송정보) 로드 확인
        CheckoutInfoPage.verifyLoaded();
    });
});
