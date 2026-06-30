// 결과 그리드 공용 컴포넌트 — 페이지(POM)가 합성(composition)해서 사용한다.
// BasePage 를 상속하지 않는다(URL 없는 UI 조각). 필요한 대기 게이트만 생성자로 주입받아 무상태를 유지한다.
export default class GridComponent {
    // waitUntil: BasePage 의 waitUntil 형태 게이트 함수 (assertCb, timeout). 함수 참조 주입이라 무상태.
    constructor(waitUntil) {
        this.waitUntil = waitUntil;
    }

    // 결과 행 출현 대기 — 고정 cy.wait 대신 사용하는 표준 행선지.
    // rowSelector: 그리드마다 행 셀렉터가 다르므로 주입받는다. 기본값은 전체 표의 행.
    //   예) 'table.result-grid tr' / '#grid_body tr'
    waitForRows(rowSelector = 'table tr', timeout = 60000) {
        return this.waitUntil((body) => {
            expect(Cypress.$(body).find(rowSelector).length, '결과 행 로드').to.be.greaterThan(1);
        }, timeout);
    }
}
