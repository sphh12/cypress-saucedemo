# Shell 스크립트 가이드

`shell/` 폴더의 스크립트 파일 용도와 호출 관계를 정리한 문서입니다.

> 이 파이프라인(메일 발송 + HTML 리포트)은 **선택 사항**입니다.
> 로컬에서는 `npm test`(= `npx cypress run`)만으로 충분히 테스트를 돌릴 수 있고,
> Docker로 실행하거나 결과를 메일/리포트로 받고 싶을 때만 아래 스크립트를 사용합니다.

---

## 활성 파일 (5개)

| 파일 | 종류 | 한줄 요약 |
|------|------|-----------|
| `run-test.sh` | 실행 | Cypress 테스트 1회 실행 + (선택) 리포트/메일 |
| `run-repeat.sh` | 실행 | `cypress-repeat`로 N회 반복 실행 + (선택) 리포트/메일 |
| `visualization.js` | 변환 | Cypress 실행 결과 → 이메일 본문용 HTML 표 |
| `curl.sh` | 발송 | SMTP로 결과 메일 발송 |
| `generate-summary.mjs` | 요약 | mochawesome JSON → 한국어 요약 텍스트 |
| `archive-report.mjs` | 보관 | HTML 리포트를 타임스탬프 폴더로 복사(실행 이력 누적) |

---

### run-test.sh (메인 실행 스크립트)

| 항목 | 내용 |
|------|------|
| 용도 | Cypress 테스트를 1회 실행 (로컬/Docker 공용) |
| 호출 | `docker-compose.yml`의 `cypress` / `cypress-dev` 서비스 → `command: sh /app/shell/run-test.sh` |
| 실행 대상 | `SPEC_FILE` 환경변수 (기본값 `cypress/e2e/**/*.cy.js`) |
| 브라우저 | Chrome (headless) |

**실행 흐름:**
```
(Linux/Docker 환경이면) Xvfb 가상 디스플레이(:99) 시작
→ npx cypress run --spec "$SPEC_FILE"
→ (선택) node shell/visualization.js 로 결과를 HTML 표로 변환
→ (선택) sh shell/curl.sh 로 이메일 발송
```

**특징:**
- `SPEC_FILE`을 지정하지 않으면 `cypress/e2e/**/*.cy.js` 전체를 실행합니다.
  - 단일 스펙만 돌리려면 예: `SPEC_FILE=cypress/e2e/sample/sample.dom.cy.js`
- 네이티브 팝업/실제 마우스 이벤트가 필요한 화면을 헤드리스 Linux에서 돌릴 때를 대비해
  Xvfb 가상 디스플레이를 자동으로 띄웁니다. (로컬 macOS/Windows 실행 시에는 건너뜀)
- `visualization.js`, `curl.sh` 호출은 **선택**입니다. SMTP 환경변수가 비어 있으면 메일 단계는 생략됩니다.

---

### run-repeat.sh (반복 실행 스크립트)

| 항목 | 내용 |
|------|------|
| 용도 | 동일 스펙을 여러 번 반복 실행하여 플래키(flaky) 테스트를 탐지 |
| 호출 | `docker-compose.yml`의 `cypress-repeat` 서비스 (profile `repeat`) → `command: sh /app/shell/run-repeat.sh` |
| 실행 대상 | `SPEC_FILE` 환경변수 (기본값 `cypress/e2e/**/*.cy.js`) |
| 반복 횟수 | `REPEAT_COUNT` 환경변수 (기본값 `3`) |

**실행 흐름:**
```
(Linux/Docker 환경이면) Xvfb 가상 디스플레이(:99) 시작
→ npx cypress-repeat run -n "$REPEAT_COUNT" --spec "$SPEC_FILE"
→ (선택) node shell/visualization.js 로 결과를 HTML 표로 변환
→ (선택) sh shell/curl.sh 로 이메일 발송
```

**run-test.sh와의 차이점:**
- `cypress run` 대신 `cypress-repeat run -n N`을 사용합니다.
- 반복 횟수를 `REPEAT_COUNT`로 제어합니다 (기본 3회).
- 그 외 리포트/메일 연동 패턴은 `run-test.sh`와 동일합니다.

---

### visualization.js (테스트 결과 → HTML 변환)

| 항목 | 내용 |
|------|------|
| 용도 | Cypress 실행 결과 텍스트(또는 mochawesome 결과)를 이메일 본문용 HTML 표로 변환 |
| 호출 | `run-test.sh`, `run-repeat.sh`에서 호출 |
| 입력 | Cypress의 "Run Finished" 이후 로그 (입력 경로는 환경변수/인자로 전달) |
| 출력 | HTML 표 텍스트 (출력 경로는 환경변수/인자로 전달) |

**변환 항목:**
- P/F (통과/실패), Spec (파일명), Time (실행 시간)
- Tests, Passing, Failing, Pending, Skipped 수치

**특징:**
- 입출력 경로는 코드에 하드코딩하지 않고 환경변수 또는 실행 인자로 받습니다.
- 메일 본문에 그대로 붙일 수 있는 간단한 HTML 표를 만드는 것이 목적입니다.

---

### curl.sh (이메일 발송)

| 항목 | 내용 |
|------|------|
| 용도 | SMTP를 통해 테스트 결과 메일 발송 |
| 호출 | `run-test.sh`, `run-repeat.sh`에서 (선택적으로) 호출 |
| 인증 | 환경변수 `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` |
| 발신/수신 | 환경변수 `MAIL_FROM` / `MAIL_TO` |

**특징:**
- 발신/수신 주소를 코드에 하드코딩하지 않고 `MAIL_FROM` / `MAIL_TO` 환경변수로 주입합니다.
- `visualization.js`가 만든 HTML 표를 메일 본문으로 사용합니다.
- SMTP 인증 정보가 비어 있으면 발송하지 않고 종료합니다(로컬 개발 시 메일 단계 자연스럽게 생략).

---

### generate-summary.mjs (한국어 요약 생성)

| 항목 | 내용 |
|------|------|
| 용도 | mochawesome 결과 JSON을 사람이 읽기 쉬운 한국어 요약 텍스트로 변환 |
| 호출 | npm 스크립트 `report:summary` (= `node shell/generate-summary.mjs`) |
| 입력 | mochawesome JSON (입력 경로는 환경변수/인자로 전달) |
| 출력 | 한국어 요약 텍스트 (출력 경로는 환경변수/인자로 전달) |

**특징:**
- `npm run report:summary` 로 단독 실행할 수 있습니다.
- 입출력 경로는 하드코딩하지 않고 환경변수 또는 실행 인자로 받습니다.

---

### archive-report.mjs (실행 이력 보관)

| 항목 | 내용 |
|------|------|
| 용도 | 매 실행마다 덮어써지는 HTML 리포트를 타임스탬프 폴더로 복사해 과거 이력을 누적 |
| 호출 | npm 스크립트 `test:history`(실행+보관) / `report:archive`(보관만) |
| 입력 | `cypress/reports/html/` (리포트 폴더 전체 — HTML·비디오 포함) |
| 출력 | `<HISTORY_DIR>/<날짜_시각>[_pass\|_fail]/` |

**특징:**
- `--run` 옵션을 주면 테스트를 직접 실행하고, **실패해도 보관**한 뒤 cypress 종료 코드를 그대로 전파합니다(CI 호환).
- `--run` 뒤의 인자는 cypress 로 그대로 전달됩니다. `--browser` 를 생략하면 `npm test` 와 동일하게 chrome 을 씁니다.
- 폴더명 상태 접미사(`_pass`/`_fail`)는 `--run` 모드에서만 붙습니다(보관 전용 모드는 결과를 알 수 없으므로 시각만).
- **안전장치**: ① 이번 실행이 리포트를 만들지 않았으면(실행 실패·스펙 0건) 직전 리포트를 오인 보관하지 않고 건너뜁니다. ② `.partial` 로 복사한 뒤 rename 하므로 복사 중
  실패한 반쪽 폴더가 정상 이력으로 남지 않습니다. ③ 정리(`HISTORY_KEEP`) 대상은 폴더명 형식이 맞고 `index.html` 이 있는 폴더로 제한해 다른 도구·사용자 폴더를 지우지
  않습니다. ④ 삭제가 실패해도(Windows 파일 점유 등) 경고만 남기고 통과한 실행을 실패로 만들지 않습니다.

---

## 호출 관계도

```
docker-compose.yml
  ├── cypress / cypress-dev 서비스
  │     └── run-test.sh
  │           ├── npx cypress run --spec "$SPEC_FILE"
  │           ├── (선택) visualization.js  → HTML 표
  │           └── (선택) curl.sh           → 이메일 발송
  │
  └── cypress-repeat 서비스 (profile: repeat)
        └── run-repeat.sh
              ├── npx cypress-repeat run -n "$REPEAT_COUNT" --spec "$SPEC_FILE"
              ├── (선택) visualization.js  → HTML 표
              └── (선택) curl.sh           → 이메일 발송

package.json
  ├── report:summary → generate-summary.mjs (mochawesome JSON → 한국어 요약)
  ├── test:history   → archive-report.mjs --run
  │                      ├── node node_modules/cypress/bin/cypress run …
  │                      └── cypress/reports/html/ → <HISTORY_DIR>/<시각>_pass|fail/
  └── report:archive → archive-report.mjs (직전 리포트만 보관)
```

---

## npm 스크립트와의 대응

| npm 스크립트 | 명령 | 관련 shell |
|--------------|------|-----------|
| `npm test` | `cypress run` | (shell 불필요) |
| `npm run test:chrome` | `cypress run --browser chrome` | (shell 불필요) |
| `npm run repeat` | `cypress-repeat run -n 3` | (shell 불필요) |
| `npm run test:history` | `node shell/archive-report.mjs --run` | `archive-report.mjs` |
| `npm run report:summary` | `node shell/generate-summary.mjs` | `generate-summary.mjs` |
| `npm run report:archive` | `node shell/archive-report.mjs` | `archive-report.mjs` |
| `npm run docker:test` | `docker compose up cypress` | `run-test.sh` |
| `npm run docker:dev` | `docker compose --profile dev up cypress-dev` | `run-test.sh` |
| `npm run docker:repeat` | `docker compose --profile repeat run --rm cypress-repeat` | `run-repeat.sh` |

---

## 환경변수 의존성

모든 값은 코드에 하드코딩하지 않습니다.
`.env.example` 을 `.env` 로 복사한 뒤 채워서 주입하세요. (메일/리포트 파이프라인을 쓸 때만 필요)

| 환경변수 | 사용 파일 | 설명 | 기본값 |
|----------|-----------|------|--------|
| `SPEC_FILE` | `run-test.sh`, `run-repeat.sh` | 실행할 스펙 경로/글롭 | `cypress/e2e/**/*.cy.js` |
| `REPEAT_COUNT` | `run-repeat.sh` | 반복 실행 횟수 | `3` |
| `SMTP_HOST` | `curl.sh` | SMTP 서버 호스트 | `smtp.gmail.com` |
| `SMTP_PORT` | `curl.sh` | SMTP 포트 | `587` |
| `SMTP_USER` | `curl.sh` | SMTP 계정 | (비움) |
| `SMTP_PASS` | `curl.sh` | SMTP 비밀번호/앱 비밀번호 | (비움) |
| `MAIL_FROM` | `curl.sh` | 발신 주소 | (비움) |
| `MAIL_TO` | `curl.sh` | 수신 주소 | (비움) |
| `ENVIRONMENT` | `run-test.sh`, `run-repeat.sh` | 이메일 제목 등에 표시할 실행 환경 이름 | `Docker` |
| `HISTORY_DIR` | `archive-report.mjs` | 실행 이력 보관 위치 | `./cypress-history` |
| `HISTORY_KEEP` | `archive-report.mjs` | 최근 N개만 유지(오래된 것 삭제) | (미지정 = 전부 유지) |

---

## 참고 (운영 메모)

- 이 스크립트들은 **선택 파이프라인**입니다. 단순히 테스트만 돌릴 때는 `npm test` 또는 `npm run test:chrome` 만 쓰면 됩니다.
- `.sh` 파일은 VS Code에서 CRLF로 저장되면 `bad interpreter: /bin/bash^M` 에러가 날 수 있으므로,
  편집 후 줄바꿈을 LF로 유지하세요. (`.gitattributes` 에서 `*.sh` 를 LF로 강제하는 것을 권장)
- CI 연동 파일은 현재 포함되어 있지 않습니다(추후 추가 예정).
