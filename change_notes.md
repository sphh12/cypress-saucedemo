# Change Notes

## 2026-06-30

- **saucedemo 전체 E2E 테스트 스위트 구현 완료 (POM)** — 7개 스펙 / 27개 테스트
  - `sphh12/cypress-template` 클론 → 가이드(W1~W8 대기, P1~P10 POM) 숙지
  - 실제 Cypress로 saucedemo 전 화면 DOM 탐색 → `data-test` 셀렉터 전수 검증
  - `cypress.env.json`: standard(local)/problem/performance 로그인 프로필 + lockedUser + 배송 테스트데이터
  - **base 수정(사용자 승인)**: `DomBasePage.body(timeout)` Cypress 15 호환 — timeout 미지정 시 옵션 없이 `cy.get('body')` 호출 (1줄)
  - **공용 컴포넌트**: `HeaderComponent` (장바구니 배지/링크 + 버거 메뉴, body/waitUntil 게이트 주입 합성 P4)
  - **페이지 객체(dom)**: LoginPage, InventoryPage, ProductDetailPage, CartPage, CheckoutInfoPage, CheckoutOverviewPage, CheckoutCompletePage
  - **스펙(cypress/e2e/saucedemo/)**: login(5) / inventory(7) / product_detail(3) / cart(4) / checkout(5) / menu(2) / purchase.basic(1)
  - **결과**: 전체 27/27 통과 · cypress-repeat 3회 반복 전부 통과(누적 81 실행, flaky 0)
  - **적대적 리뷰**(대기/POM/셀렉터/Cypress15 4차원): POM·셀렉터·Cypress15 CLEAN, W5 메뉴 전환 타임아웃만 20s로 정렬
  - 참고: `report:summary`(generate-summary.mjs)는 리포터가 HTML 병합 후 `.jsons`를 비워 단독 실행 시 JSON 미발견 → HTML 리포트(`cypress/reports/html/index.html`)는 정상
