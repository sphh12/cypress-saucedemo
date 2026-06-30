import InventoryPage from '../../pages/dom/InventoryPage';
import ProductDetailPage from '../../pages/dom/ProductDetailPage';

describe('[saucedemo] 상품 상세', () => {
    // 표준 유저로 로그인 → /inventory.html 진입
    beforeEach(() => {
        cy.login('local');
    });

    it('상품명을 클릭하면 해당 상품 상세로 진입한다', () => {
        // 인벤토리에서 상품명을 클릭해 상세로 진입하고 상품명을 검증한다
        InventoryPage.verifyLoaded().openProductByName('Sauce Labs Backpack');
        ProductDetailPage.verifyLoaded().verifyProductName('Sauce Labs Backpack');
    });

    it('상세 화면에서 상품을 장바구니에 담을 수 있다', () => {
        // 상세 화면에서 담기 후 Remove 버튼 노출(담김)을 검증한다
        InventoryPage.verifyLoaded().openProductByName('Sauce Labs Backpack');
        ProductDetailPage.verifyLoaded().addToCart().verifyAddedToCart();
    });

    it('상세에서 목록으로 돌아갈 수 있다', () => {
        // 상세에서 목록으로 복귀하면 인벤토리로 되돌아온다
        InventoryPage.verifyLoaded().openProductByName('Sauce Labs Backpack');
        ProductDetailPage.verifyLoaded().backToProducts();
        InventoryPage.verifyLoaded();
    });
});
