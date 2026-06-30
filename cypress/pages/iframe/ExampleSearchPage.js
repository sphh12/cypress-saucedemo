// [예시 POM — iframe 버전] 검색 화면: 메뉴 진입 → 검색 → 결과 검증
// 레거시 iframe 관리자(예: ASP.NET) 대상. IframeBasePage 상속 + GridComponent 합성.
// POM 표준 4단 구조(open / verifyTitle / search / verifyResult)와 메서드 체이닝을 보여주는 학습용 예시.
// 실제 프로젝트에서는 selectors / 메뉴명 / 타이틀 텍스트를 대상 화면에 맞게 바꾸세요.
import IframeBasePage from '../base/IframeBasePage';
import GridComponent from '../components/GridComponent';
import { enterMenu } from '../../e2e/module/iframe';

class ExampleSearchPage extends IframeBasePage {
    selectors = {
        keyword: '#searchInput',
        searchBtn: '#searchBtn',
        resultTable: 'table.result-grid',
    };

    // 그리드 컴포넌트 합성 — 자신의 waitUntil 게이트를 주입한다
    grid = new GridComponent((cb, t) => this.waitUntil(cb, t));

    open() {
        // 상단 메뉴 진입 예시 (1단: 'Example' > 'Search') — 실제 메뉴명/구조에 맞게 수정
        enterMenu('Example', 'Search');
        return this;
    }

    verifyTitle() {
        this.waitUntil((body) => {
            expect(body.textContent, '검색 화면 타이틀').to.include('Search');
        }, 20000);
        return this;
    }

    search(keyword) {
        // 고정 cy.wait 없이, 입력값이 반영될 때까지 명시적으로 대기
        this.body().find(this.selectors.keyword).clear().type(keyword).should('have.value', keyword);
        this.body().find(this.selectors.searchBtn).click();
        return this;
    }

    verifyResult() {
        // 결과 행 출현 대기 (신선 body 게이트)
        this.grid.waitForRows(`${this.selectors.resultTable} tr`, 60000);
        cy.log('## 검색 결과 확인 완료 ##');
        return this;
    }
}

export default new ExampleSearchPage(); // 무상태 싱글톤
