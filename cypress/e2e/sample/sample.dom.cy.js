// [샘플 스펙 — 일반 SPA] cy.login 커스텀 커맨드 + DOM POM 사용 예시
//
// 실행 전 준비:
//   1) cypress.env.example.json 을 cypress.env.json 으로 복사
//   2) loginEnvs.local 의 url/username/password/selectors 를 대상 사이트에 맞게 채우기
//   3) pages/dom/ExampleSearchPage.js 의 selectors/메뉴를 대상 화면에 맞게 수정
//
// 이 샘플은 "구조"를 보여주기 위한 것으로, 기본 placeholder(example.com)로는 실제 통과하지 않을 수 있습니다.
import ExampleSearchPage from '../../pages/dom/ExampleSearchPage';

describe('[샘플] 일반 SPA - 검색 플로우', () => {
    beforeEach(() => {
        cy.login('local'); // cypress.env.json 의 loginEnvs.local 사용
    });

    it('검색 화면에서 키워드로 검색하고 결과를 확인한다', () => {
        ExampleSearchPage
            .open('/search')      // 화면 진입
            .verifyTitle()        // 타이틀 검증
            .search('TEST_KEYWORD') // 검색
            .verifyResult();      // 결과 검증
    });
});
