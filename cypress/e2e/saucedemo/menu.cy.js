import InventoryPage from '../../pages/dom/InventoryPage';
import LoginPage from '../../pages/dom/LoginPage';

// saucedemo 버거 메뉴 기능 검증 (로그아웃 / 앱 상태 초기화)
describe('[saucedemo] 메뉴', () => {
    beforeEach(() => {
        cy.login('local'); // standard_user 로그인 → 인벤토리 진입
    });

    it('로그아웃하면 로그인 화면으로 돌아간다', () => {
        // 인벤토리 로드 확인 후 버거 메뉴에서 로그아웃
        InventoryPage.verifyLoaded().logout();

        // 로그인 화면으로 복귀했는지 확인
        LoginPage.verifyOnLoginPage();
    });

    it('앱 상태 초기화를 하면 장바구니 배지가 사라진다', () => {
        // 상품을 담아 배지 수량 1을 만든 뒤, 앱 상태 초기화로 배지가 사라지는지 확인
        InventoryPage.verifyLoaded()
            .addItemToCart('sauce-labs-backpack')
            .verifyCartBadgeCount(1)
            .resetAppState()
            .verifyCartBadgeCount(0);
    });
});
