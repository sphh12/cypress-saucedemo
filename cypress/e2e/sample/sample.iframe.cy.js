// [샘플 스펙 — iframe 레거시 관리자] cy.login 커스텀 커맨드 + iframe POM 사용 예시
//
// 실행 전 준비:
//   1) cypress.env.example.json 을 cypress.env.json 으로 복사
//   2) loginEnvs.iframeLegacy 의 url/username/password/compCode/selectors 를 대상 사이트에 맞게 채우기
//   3) pages/iframe/ExampleSearchPage.js 의 selectors/메뉴명과 module/iframe.js 의 NAV/FRAME 셀렉터를 대상 화면에 맞게 수정
//
// 이 샘플은 "구조"를 보여주기 위한 것으로, 기본 placeholder(example.com)로는 실제 통과하지 않을 수 있습니다.
import ExampleSearchPage from '../../pages/iframe/ExampleSearchPage';

describe('[샘플] iframe 레거시 관리자 - 검색 플로우', () => {
    beforeEach(() => {
        cy.login('iframeLegacy'); // cypress.env.json 의 loginEnvs.iframeLegacy 사용
    });

    it('검색 화면에서 키워드로 검색하고 결과를 확인한다', () => {
        ExampleSearchPage
            .open()               // 메뉴 진입
            .verifyTitle()        // 타이틀 검증
            .search('TEST_KEYWORD') // 검색
            .verifyResult();      // 결과 검증
    });
});
