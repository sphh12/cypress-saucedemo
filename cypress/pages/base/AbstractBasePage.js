// POM 공통 부모 (추상) — 화면 접근 방식과 무관한 "공통 규칙/절차"를 모아둔다.
// 설계: Template Method 패턴. 부모가 절차의 틀을 정의하고, 자식이 "화면에 어떻게 닿는가"만 채운다.
//   - IframeBasePage : iframe 안쪽(iframe#mainFrame)에 닿는다 (레거시 관리자 등)
//   - DomBasePage    : 일반 DOM(cy.get('body'))에 바로 닿는다 (일반 SPA)
//
// 공통 규칙(요약):
//   - 무상태: Cypress 체인/요소/body 를 인스턴스 필드에 저장하지 않는다 (저장 즉시 stale 참조가 됨).
//   - 액션 메서드는 return this 로 체이닝한다.
//   - 대기/검증은 고정 cy.wait 대신 waitUntil 게이트(재시도)로 처리한다.
export default class AbstractBasePage {
    // [추상] 동작용 body 취득 (find/click/type 의 출발점). 매 호출마다 재취득해 stale 을 피한다.
    //   자식이 환경에 맞게 구현한다.
    body(timeout) {
        throw new Error('AbstractBasePage.body() 는 자식 클래스에서 구현해야 합니다.');
    }

    // [추상] 대기/검증 게이트 — assertCb 안에서는 expect 만 사용(cy.* 금지, 멱등).
    //   매 재시도마다 "신선한" body 를 다시 받아 assertCb 에 넘긴다. 자식이 구현한다.
    waitUntil(assertCb, timeout = 60000) {
        throw new Error('AbstractBasePage.waitUntil() 는 자식 클래스에서 구현해야 합니다.');
    }

    // 페이지 유효성 검사 — 기본은 no-op. 환경별로 자식이 선택적으로 override 한다.
    validate() {
        return this;
    }

    // 공통 진단 로그 — 환경 무관(현재 URL/타이틀). cypress 실행 시 --env DIAG=true 일 때만 동작.
    diag(label) {
        if (!Cypress.env('DIAG')) return this;
        cy.url().then((u) => cy.title().then((t) => cy.log(`[DIAG ${label}] url=${u} | title=${t}`)));
        return this;
    }
}
