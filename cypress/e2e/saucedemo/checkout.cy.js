import InventoryPage from '../../pages/dom/InventoryPage';
import CartPage from '../../pages/dom/CartPage';
import CheckoutInfoPage from '../../pages/dom/CheckoutInfoPage';
import CheckoutOverviewPage from '../../pages/dom/CheckoutOverviewPage';
import CheckoutCompletePage from '../../pages/dom/CheckoutCompletePage';

// saucedemo 체크아웃 — 배송정보 입력 검증 및 주문 완료 플로우
describe('[saucedemo] 체크아웃', () => {
    beforeEach(() => {
        cy.login('local'); // standard_user 로그인 → 인벤토리 진입
    });

    // 인벤토리 → 카트 → 체크아웃 1단계까지 이동하는 로컬 헬퍼 (페이지 객체 아님, 셀렉터 직접 사용 금지)
    function goToCheckoutInfo(slug) {
        InventoryPage.verifyLoaded().addItemToCart(slug).goToCart();
        CartPage.verifyLoaded().checkout();
    }

    it('이름을 비우면 이름 필수 에러가 표시된다', () => {
        // 상품 1개 담고 체크아웃 1단계 진입
        goToCheckoutInfo('sauce-labs-backpack');
        // 이름 필드를 비운 채 진행 → 이름 필수 에러 검증
        CheckoutInfoPage.verifyLoaded()
            .fillShippingInfo('', 'Hong', '12345')
            .submitInfo()
            .verifyError('First Name is required');
    });

    it('성을 비우면 성 필수 에러가 표시된다', () => {
        // 상품 1개 담고 체크아웃 1단계 진입
        goToCheckoutInfo('sauce-labs-backpack');
        // 성 필드를 비운 채 진행 → 성 필수 에러 검증
        CheckoutInfoPage.verifyLoaded()
            .fillShippingInfo('Gildong', '', '12345')
            .submitInfo()
            .verifyError('Last Name is required');
    });

    it('우편번호를 비우면 우편번호 필수 에러가 표시된다', () => {
        // 상품 1개 담고 체크아웃 1단계 진입
        goToCheckoutInfo('sauce-labs-backpack');
        // 우편번호 필드를 비운 채 진행 → 우편번호 필수 에러 검증
        CheckoutInfoPage.verifyLoaded()
            .fillShippingInfo('Gildong', 'Hong', '')
            .submitInfo()
            .verifyError('Postal Code is required');
    });

    it('취소를 누르면 장바구니로 돌아간다', () => {
        // 상품 1개 담고 체크아웃 1단계 진입
        goToCheckoutInfo('sauce-labs-backpack');
        // 취소 클릭 → 장바구니 화면 복귀 검증
        CheckoutInfoPage.verifyLoaded().cancel();
        CartPage.verifyLoaded();
    });

    it('여러 상품을 담아 배송정보 입력 후 주문을 완료한다', () => {
        // 1) 인벤토리: 상품 2개 담기 → 카트 이동
        InventoryPage.verifyLoaded()
            .addItemToCart('sauce-labs-backpack')
            .addItemToCart('sauce-labs-bike-light')
            .goToCart();

        // 2) 카트: 체크아웃 진행
        CartPage.verifyLoaded().checkout();

        // 3) 체크아웃 1단계: 더미 배송 데이터 입력 → 다음
        const td = Cypress.env('testdata'); // { firstName, lastName, postalCode }
        CheckoutInfoPage.verifyLoaded()
            .fillShippingInfo(td.firstName, td.lastName, td.postalCode)
            .submitInfo();

        // 4) 체크아웃 2단계: 상품 개수/금액 일관성 확인 → 주문 확정
        CheckoutOverviewPage.verifyLoaded().verifyItemCount(2).verifyTotalsConsistent().finish();

        // 5) 완료: 주문 완료 메시지 확인
        CheckoutCompletePage.verifyLoaded().verifyOrderComplete();
    });
});
