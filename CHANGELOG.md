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
- [ ] `npm test` 스코프 방침 결정 — `sample/`(대상 앱 미설정 플레이스홀더)·`example/`(Kitchen Sink 학습 예제) 때문에 전체 실행(20 스펙)이 항상 실패한다. `specPattern` 변경 / 해당 스펙 삭제 / 현상 유지 중 택일 (CI 는 `--spec` 으로 이미 우회함)

## [2026-08-28]

### Changed

- **저장소명 변경: `cypress_swagLabs` → `cypress-saucedemo`** (GitHub 리네임 + 로컬 리모트 URL 갱신)
  - 워크플로 표시명: `"Cypress E2E - Swag Labs"` → `"cypress-saucedemo"`
  - `package.json`: `name` `cypress-template` → `cypress-saucedemo`, `description` 를 실제 프로젝트 내용으로 갱신
    (템플릿 시절 값이 남아 있었음). `package-lock.json` 도 함께 동기화 — 불일치 시 CI 의 `npm ci` 가 실패한다
  - `docs/Setup-Guide.md`: clone 주소·`cd` 경로 갱신
  - `README.md`: 구조 트리 루트 `cypress_template/` → `cypress-saucedemo/`
  - 워크플로 파일명은 `cypress.yml` 유지 (문서 3곳의 `gh workflow run cypress.yml` 명령과 일치)

## [2026-08-27]

### Added

- **GitHub Actions 데일리 회귀 CI 구축** — `.github/workflows/cypress.yml`
  - 트리거 4종: `main` push / PR / `workflow_dispatch`(수동) / `schedule`
  - 야간 회귀: `cron: '17 18 * * *'` = UTC 18:17 = **KST 03:17** (정시는 GitHub 부하로 지연되므로 비정시)
  - CI 에서만 실패 시 2회 재시도(`--config retries=2`) — 실행 인자라 로컬 `npm test` 동작은 불변
  - HTML 리포트 + 실패 스크린샷을 아티팩트로 업로드(`if: !cancelled()`, 보관 30일)
  - Cypress 바이너리 캐시를 `npm ci` 앞에 배치 — 순서가 바뀌면 매 실행 ~300MB 재다운로드
  - 시크릿 불필요: 환경값이 전부 saucedemo 공개 데모값이라 `cypress.env.example.json` 복사로 해결
  - 커밋 전 2겹 검증(YAML 파싱 + actionlint 스키마) 수행 — 콜론 미인용으로 워크플로가 통째로 무효화되는 사고 방지
  - 회귀 대상은 `--spec` 으로 saucedemo 스위트(7 스펙 / 27 테스트)로 한정 — `sample/`(미설정 플레이스홀더, 로컬에서도 실패)·`example/`(외부 사이트 학습 예제) 제외
  - 첫 런(Chrome 151 / Node 22)에서 위 사전 문제가 드러나 스코프를 조정함 — saucedemo 27개는 첫 런에서도 전부 통과
  - 액션은 최신 메이저 사용(checkout v7 · setup-node v7 · cache v6 · upload-artifact v7) — Node 20 deprecation 경고 제거
- **`docs/ci-guide.md` 신설** — 트리거·동작 흐름·리포트 확인·확장(매트릭스·concurrency)·YAML 검증 절차

### Changed

- `.gitignore`: `package-lock.json` 제외 규칙 제거 → lockfile 커밋 (CI 에서 `npm ci` 로 재현 설치·캐시 활용)
- `.gitattributes`: `*.yml`·`*.yaml` 을 LF 로 고정 (CI 러너는 Linux)
- `README.md`: 실행 절에 CI 안내 추가, docs 표에 `ci-guide.md` 추가(7종 → 8종), 구조 트리에 `.github/` 반영
- `cypress.config.js`: Cypress 15.4.0 에서 제거된 `experimentalStudio` 옵션 삭제 (매 실행 경고 출력)

## [2026-08-24]

### Added

- **실행 결과 히스토리 보관 기능 추가** — `shell/archive-report.mjs`
  - mochawesome 리포트가 매 실행 덮어쓰기되어 직전 결과만 남는 문제 대응
  - `cypress-history/<날짜_시각>[_pass|_fail]/`에 리포트 전체(HTML·비디오) 복사
  - npm script: `test:history`(실행+보관) / `report:archive`(보관만) 추가
  - 테스트 **실패 시에도 보관**하고 cypress 종료 코드를 그대로 전파(CI 호환)
  - `HISTORY_DIR`(위치)·`HISTORY_KEEP`(보관 개수) 환경변수 지원, `cypress-history/` gitignore 등록
  - Windows Node 20+ 에서 `.cmd` 래퍼 spawn 이 차단(EINVAL)되는 문제 대응 — `npx` 대신 `createRequire` 로 cypress CLI 를 해석해 `process.execPath` 로 직접 실행
  - **코드 리뷰 반영(적대적 리뷰 8건 중 5건 수정)**: ① 이번 실행이 리포트를 만들지 않았을 때 직전 리포트를 결과로 오인 보관하던 문제(mtime 검사로 차단) ② 보관 실패 시 통과로 보고하던 종료 코드 ③ 인자를 넘기면 `--browser chrome` 기본값이 사라져 Electron 으로 실행되던 문제 ④ 복사 중 실패한 반쪽 폴더가 정상 이력으로 남던 문제(`.partial` → rename) ⑤ 이력 삭제 실패(Windows 파일 점유)가 통과한 실행을 실패로 만들던 문제
  - 정리(`HISTORY_KEEP`) 대상을 "폴더명 형식 일치 + `index.html` 존재"로 제한 — 다른 도구·사용자 폴더 삭제 방지
- **`docs/Shell-Scripts-Guide.md` 갱신** — `archive-report.mjs` 항목·호출 관계도·npm 대응표·환경변수 표 추가
- **`docs/Setup-Guide.md` 신설 — 환경 세팅 통합 가이드**
  - clone → 설치 → 설정 파일 생성 → 스모크 테스트 검증까지 단일 문서로 통합
  - 회사망 SSL 인터셉트로 인한 Cypress 바이너리 다운로드 실패 해결 절차(실측) 수록
  - 구 `docs/Mac-Dev-Setup-Guide.md` 내용을 macOS 절로 흡수 후 원본 삭제 (참조 1건 갱신)

### Changed

- `README.md`: 서두에 테스트 대상 사이트(Swag Labs/saucedemo) 소개 추가, 빠른 시작 절에 Setup-Guide 링크 추가, docs 표 갱신
- `package.json`: cypress `^15.14.1` → `15.14.1` 정확 고정 (회사망에서 캐시 바이너리와 버전 일치 보장, 커밋 181ecb4)

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
