# Changelog

> [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따르며, **최신 항목이 위**에 온다.
> 분류는 `### Added` / `### Changed` / `### Fixed` 헤더를 사용한다.
> 오래된 이력(6개월 이상)은 `archive/CHANGELOG-<범위>.md`로 분리한다 (현재는 분량이 적어 아카이브 없음).
> (구 `change_notes.md` + `Todo.md`를 2026-08-24 이 파일로 통합 — 원문 무손실)

## [Unreleased]

- [ ] (선택) `report:summary` 가 mochawesome JSON 을 보존하도록 설정 보완 (현재 HTML 리포트는 정상)
- [ ] (선택) `Test.allTheThings() T-Shirt` 등 특수문자 slug 상품 케이스 추가
- [ ] (선택) `cy.session` 기반 로그인 캐싱 도입 검토 (P10 — 동작 변경이라 별도 검토)
- [ ] (선택) problem_user / performance_glitch_user 시나리오 스펙 추가

## [2026-07-02]

### Changed

- **기본 실행 브라우저를 Chrome 으로 변경 + 크로스브라우저 검증**
  - `package.json`: `test` → `cypress run --browser chrome`, `repeat` → `--browser chrome`, 내장 Electron 폴백용 `test:electron` 스크립트 추가
  - 전체 스위트를 Chrome 149 stable 로 재실행 → 27/27 통과 (Electron 과 동일 결과, 크로스브라우저 확인)

## [2026-06-30]

### Added

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

---

## 부록 — 구 `Todo.md` 완료 목록 (원문 보존, 2026-06-30~07-02 작업분)

- [x] 템플릿 클론 + 구조/가이드 숙지
- [x] saucedemo 전체 화면 DOM 탐색 + 셀렉터 검증
- [x] 기본 구매 플로우 POM + 스펙 + 반복 테스트 통과
- [x] DomBasePage Cypress 15 호환 수정 (사용자 승인)
- [x] 전체 스위트 구현(7 스펙 / 27 테스트): 로그인·인벤토리·상세·장바구니·체크아웃·메뉴
- [x] 반복 실행 안정성 검증 (3회 × 27 = 81 실행, flaky 0)
- [x] 적대적 리뷰 4차원 통과
