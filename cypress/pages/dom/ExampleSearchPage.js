// [예시 POM — 일반 SPA 버전] 검색 화면: 페이지 진입 → 검색 → 결과 검증
// 일반 웹앱(React/Vue 등, iframe 없음) 대상. DomBasePage 상속 + GridComponent 합성.
// iframe 버전(pages/iframe/ExampleSearchPage.js)과 비교해 보세요 — search/verifyResult 로직은 동일하고
// "화면에 닿는 법"(부모 클래스)과 화면 진입 방식(open)만 다릅니다.
import DomBasePage from '../base/DomBasePage';
import GridComponent from '../components/GridComponent';

class ExampleSearchPage extends DomBasePage {
    selectors = {
        keyword: '#searchInput',
        searchBtn: '#searchBtn',
        resultTable: 'table.result-grid',
    };

    // 그리드 컴포넌트 합성 — 자신의 waitUntil 게이트를 주입한다
    grid = new GridComponent((cb, t) => this.waitUntil(cb, t));

    open(url = '/search') {
        // 일반 SPA 는 URL 이동으로 화면 진입 (기대 텍스트 등장까지 대기)
        this.goTo(url, 'Search');
        return this;
    }

    verifyTitle() {
        this.waitUntil((body) => {
            expect(body.textContent, '검색 화면 타이틀').to.include('Search');
        }, 20000);
        return this;
    }

    search(keyword) {
        this.body().find(this.selectors.keyword).clear().type(keyword).should('have.value', keyword);
        this.body().find(this.selectors.searchBtn).click();
        return this;
    }

    verifyResult() {
        this.grid.waitForRows(`${this.selectors.resultTable} tr`, 60000);
        cy.log('## 검색 결과 확인 완료 ##');
        return this;
    }
}

export default new ExampleSearchPage(); // 무상태 싱글톤
