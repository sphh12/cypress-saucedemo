# CI 가이드 (GitHub Actions)

`.github/workflows/cypress.yml` 이 push / PR / 수동 실행 / 매일 정기 실행 시 전체 테스트(7 스펙 / 27 테스트)를 돌리고
HTML 리포트(`cypress/reports/html/index.html`)와 실패 산출물(스크린샷·비디오)을 아티팩트로 업로드한다.

## 실행 트리거 4가지

| 트리거              | 방식 | 코드 변경 | 용도                                        |
| ------------------- | ---- | --------- | ------------------------------------------- |
| `push`              | 자동 | 필요      | main 푸시 시 회귀 검증                      |
| `pull_request`      | 자동 | 필요      | PR 머지 전 게이트                           |
| `workflow_dispatch` | 수동 | 불필요    | Actions 탭 "Run workflow" — 올라간 코드 재실행 |
| `schedule`          | 자동 | 불필요    | 야간 회귀 (매일 KST 03:17)                  |

수동 실행/재실행은 CLI 로도 가능하다:

```bash
gh workflow run cypress.yml        # 최신 main 코드로 새로 실행
gh run list --limit 5              # 최근 실행 목록·상태 확인
gh run view <런ID>                 # 특정 런 상세
gh run view <런ID> --log-failed    # 실패한 스텝 로그만 보기
gh run rerun <런ID>                # 그 런이 쓴 커밋으로 재실행 (플레이키 확인용)
gh run rerun <런ID> --failed       # 실패한 job 만 재실행
```

## 동작 흐름

1. push / PR / 수동 실행 / 스케줄 중 하나로 워크플로 시작
2. Node 22 설치(+npm 캐시) → **Cypress 바이너리 캐시 복원** → `npm ci` → `npx cypress verify`
3. `cp cypress.env.example.json cypress.env.json` — 로그인 프로필·테스트데이터 주입 파일 생성
4. `npx cypress run --browser chrome --spec "cypress/e2e/saucedemo/**/*.cy.js" --config retries=2` 실행
   — CI 에서만 실패 시 2회 재시도 (플레이키 완화)
5. 성공/실패와 무관하게 `cypress/reports/html/` + `cypress/screenshots/` 를 아티팩트로 업로드 (보관 30일)

### 회귀 대상 스코프

`cypress.config.js` 의 `specPattern` 은 `cypress/e2e/**/*.cy.js` 라서 전체 20 스펙이 잡히지만,
CI 는 `--spec` 으로 **saucedemo 스위트(7 스펙 / 27 테스트)만** 돌린다. 나머지는 템플릿 잔여물이다.

| 경로 | 성격 | CI 포함 |
|------|------|:------:|
| `cypress/e2e/saucedemo/` | 이 프로젝트의 실제 E2E 스위트 | ✅ |
| `cypress/e2e/sample/` | 대상 앱이 설정되지 않은 플레이스홀더 스텁 — **로컬에서도 실패한다** | ❌ |
| `cypress/e2e/example/` | example.cypress.io 를 치는 Kitchen Sink 학습 예제 (외부 사이트) | ❌ |

> `npm test` 는 여전히 20 스펙 전체를 돌리므로 sample 2건이 실패한다.
> 로컬에서 실제 스위트만 확인하려면 `npx cypress run --spec "cypress/e2e/saucedemo/**/*.cy.js"` 를 쓴다.

### 왜 이런 순서인가

- **바이너리 캐시를 `npm ci` 앞에** 둔다: Cypress 바이너리(~300MB)는 `node_modules` 밖(`~/.cache/Cypress`)에 설치되므로,
  캐시를 먼저 복원해야 `npm ci` 의 postinstall 이 재다운로드를 건너뛴다. 순서를 바꾸면 매 실행마다 300MB 를 새로 받는다.
- **`npm ci` 를 쓴다**: `package-lock.json` 을 커밋해 두었으므로 CI 는 lockfile 그대로 재현 설치한다.
  `npm install` 을 쓰면 `^` 범위 의존성이 매번 다른 minor 로 해석돼 "로컬은 되는데 CI만 빨간" 상황을 만든다.
- **재시도는 CI 전용**이다: `--config retries=2` 는 실행 인자라 로컬 `npm test` 동작을 바꾸지 않는다.
  로컬에서는 플레이키를 그대로 체감해야 원인을 잡을 수 있기 때문이다.

## 시크릿이 필요 없는 이유

이 프로젝트가 쓰는 환경값(`loginEnvs` / `loginEnv` / `lockedUser` / `testdata`)은 전부 **saucedemo 공개 데모 계정**이며
`cypress.env.example.json` 에 이미 커밋되어 있다. 따라서 Repository Secrets 등록 없이 CI 에서 파일만 복사하면 된다.

실제 민감값을 쓰는 프로젝트로 이식할 때는 저장소 **Settings → Secrets and variables → Actions** 에 등록한 뒤
`CYPRESS_` 접두사 환경변수로 주입한다 (Cypress 는 `CYPRESS_` 로 시작하는 환경변수를 `Cypress.env()` 로 노출한다):

```yaml
- name: "테스트 실행"
  run: npx cypress run --browser chrome --config retries=2
  env:
    CYPRESS_LOGIN_PASSWORD: ${{ secrets.LOGIN_PASSWORD }}
```

## 리포트 확인 방법

GitHub → Actions 탭 → 해당 실행 → Artifacts → `cypress-report` 다운로드 → 압축 해제 후:

- `cypress/reports/html/index.html` : 브라우저로 **바로 열면** 전체 결과 요약. CSS·JS·스크린샷이 인라인이라 서버가 필요 없다.
- `cypress/reports/html/videos/<스펙>.mp4` : **실패한 스펙의 비디오만** 남는다.
  (`cypress.config.js` 의 `after:spec` 훅이 성공한 스펙의 비디오를 삭제한다)
- `cypress/screenshots/` : 실패 시점 스크린샷 (HTML 리포트에도 embed 되어 있다)

> Playwright 의 `trace.zip`(타임라인 되돌리기)에 상응하는 기능은 Cypress OSS 에 없다.
> Cypress Cloud 의 Test Replay 가 그 역할이지만 이 프로젝트는 Cloud 연동을 의도적으로 제거했으므로(커밋 `7cb743b`),
> 실패 디버깅은 **비디오 + 스크린샷 + HTML 리포트** 3종으로 한다.
> 로컬에서 더 깊게 파야 하면 `npm run open` 의 타임 트래블(커맨드 단위 DOM 스냅샷)이 가장 강력하다.

## 자주 쓰는 확장

### 멀티 브라우저 매트릭스

```yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chrome, firefox, edge]
steps:
  - run: npx cypress run --browser ${{ matrix.browser }} --config retries=2
```

(GitHub 의 ubuntu 러너에는 Chrome·Firefox·Edge 가 미리 설치되어 있어 추가 설치가 필요 없다.
아티팩트 이름이 겹치면 업로드가 실패하므로 `name: cypress-report-${{ matrix.browser }}` 처럼 분리한다.)

### 중복 실행 취소 (러너 절약)

```yaml
concurrency:
  group: "${{ github.workflow }}-${{ github.ref }}"
  # 스케줄 런은 취소하지 않는다 — 야간 회귀 신호를 잃지 않기 위해
  cancel-in-progress: ${{ github.event_name != 'schedule' }}
```

### 스케줄 실행 (설정 완료 — 매일 정기 회귀)

현재 워크플로에 아래와 같이 적용되어 있다:

```yaml
on:
  schedule:
    - cron: '17 18 * * *' # UTC 18:17 = KST 03:17 (다음날 새벽)
```

코드 변경이 없어도 매일 돌기 때문에 **대상 사이트(saucedemo)의 UI·셀렉터 변화**와
**플레이키 테스트**를 잡아낸다. 주기를 바꿀 때 알아둘 점:

- `cron` 은 **UTC 기준**이다. KST = UTC + 9 (한국은 서머타임이 없어 연중 동일).
  KST 03:00 을 원하면 UTC 18:00 — **날짜가 하루 앞선다**는 점에 주의.
- 정시(`:00`)는 GitHub 부하가 몰려 수 분~수십 분 지연될 수 있다 — 분 단위를 비정시로 두는 편이 낫다.
- **기본 브랜치(main)** 의 워크플로 파일만 스케줄 실행된다. 브랜치에서 cron 을 바꿔도 머지 전에는 적용되지 않는다.
- 저장소가 **60일간 활동이 없으면** GitHub 이 스케줄 워크플로를 자동 비활성화한다(알림 메일 발송).
  이때는 Actions 탭에서 다시 활성화하면 된다.

## 워크플로 파일 수정 시 (필수 검증)

**워크플로 YAML 이 깨지면 job 이 아예 생성되지 않아 "조용히" 실패한다** — Actions 탭에 아무 것도 안 뜨거나
파싱 에러만 남는다. 특히 **값에 콜론(`:`)이나 하이픈이 있으면 반드시 따옴표로 감쌀 것.**

```yaml
- name: 테스트 실행 (CI: 실패 시 2회 재시도)     # ❌ 콜론 때문에 파일 전체가 무효
- name: "테스트 실행 (CI: 실패 시 2회 재시도)"   # ✅
```

커밋 전에 로컬에서 두 겹으로 검증한다:

```bash
# 1겹 — YAML 파싱
python -c "import yaml; yaml.safe_load(open('.github/workflows/cypress.yml', encoding='utf-8')); print('OK')"

# 2겹 — GitHub Actions 스키마까지 검증 (actionlint)
#   설치: gh release download --repo rhysd/actionlint --pattern "*windows_amd64.zip"
actionlint .github/workflows/cypress.yml
```

푸시 후에는 **실제 런이 green 인지** 반드시 확인한다 (파일이 깨져 있으면 런 자체가 생성되지 않는다):

```bash
gh run list --limit 3
gh run view <런ID> --log-failed
```

## 다른 CI 를 쓰는 경우

핵심 커맨드는 동일하다: `npm ci` → `cp cypress.env.example.json cypress.env.json` → `npx cypress run --browser chrome`.
Docker 실행 환경이라면 `cypress/browsers:*` 이미지를 쓰면 브라우저·의존성 설치가 생략된다
(이 저장소의 `docker-compose.yml` 이 이미 해당 이미지를 사용한다).
