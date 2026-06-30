# Git 푸시 규칙 (Git Push Rules)

이 문서는 코드를 Git 저장소에 푸시할 때 준수해야 할 규칙을 정리합니다.

---

## 1. 기본 푸시 정책

여러 원격 저장소를 사용하는 경우, 별도의 언급이 없으면 **설정된 모든 원격에 푸시**를 진행한다.

```bash
# 여러 저장소에 동시 푸시 (origin 외 추가 원격이 있을 때)
git push origin <branch>
git push <other-remote> <branch>
```

---

## 2. 저장소 유형별 보안 정책

### Private 저장소 (개인/팀 전용)

| 항목 | 필수 여부 | 설명 |
|------|-----------|------|
| 민감정보 스캔 | **불필요** | 접근 권한이 제한되므로 스캔 생략 |
| 민감정보 포함 | **허용** | `cypress.env.json` 등 푸시 가능 |
| 환경변수 분리 | 불필요 | 하드코딩도 허용 (Private이므로) |
| .gitignore 설정 | 권장 | 빌드 산출물, node_modules 등 제외 권장 (민감 파일은 제외하지 않음) |

> **참고**: Private 저장소에서는 `cypress.env.json` 등 민감 파일을 그대로 푸시할 수 있습니다.
> 단, 본 템플릿은 기본적으로 `cypress.env.json`을 `.gitignore` 처리하고 `cypress.env.example.json`만 커밋하는 방식을 권장합니다.

### Public 저장소 (공개)

| 항목 | 필수 여부 | 설명 |
|------|-----------|------|
| 민감정보 스캔 | **필수** | 푸시 전 반드시 민감정보 검색 실행 |
| 민감정보 제거 | **필수** | 누구나 접근 가능하므로 반드시 제거 |
| 환경변수 분리 | **필수** | 모든 민감정보는 환경변수로 처리 |
| .gitignore 설정 | **필수** | `cypress.env.json`, APK, UI 덤프 등 반드시 제외 |
| example 파일 제공 | **필수** | 설정 방법 안내를 위한 템플릿 필수 (`cypress.env.example.json`) |

> **중요**: Public 저장소에 민감정보가 한 번이라도 커밋되면, 히스토리에 영구 기록됩니다.
> 삭제 후에도 복구 가능하므로 **푸시 전 반드시 확인**하세요.

### .gitignore 전환 가이드

Private → Public 저장소로 전환 시, `.gitignore`에서 아래 항목의 주석을 해제합니다:

```gitignore
# Private 저장소: 주석 유지 (푸시 허용)
# Public 저장소: 주석 해제 (푸시 제외)
cypress.env.json
cypress/fixtures/testdata.json
```

---

## 3. 저장소 유형별 민감정보 처리 가이드

### Private 저장소 — 그대로 푸시

아래 항목들을 코드/파일에 포함한 채 푸시할 수 있습니다.

| 분류 | 파일/항목 | 예시 |
|------|-----------|------|
| 환경변수/로그인 | `cypress.env.json` | SMTP 비밀번호, 로그인 계정 등 |
| 테스트 데이터 | `cypress/fixtures/testdata.json` | 테스트용 고정 데이터 |
| 개인정보 | `cypress.env.json` > `loginEnvs` | (Private에서만, 본 템플릿에서는 권장하지 않음) |
| 빌드 산출물 | 빌드 파일 | 산출 바이너리 |
| 계정 정보 | 코드 내 하드코딩 | 테스트 ID/PW, 회사 코드 |

```gitignore
# .gitignore (Private 저장소)
# 민감 파일 — 주석 처리하여 푸시 허용
# cypress.env.json
# cypress/fixtures/testdata.json
```

### Public 저장소 — .gitignore에 추가하여 제외

아래 항목들을 반드시 `.gitignore`에 추가하고, 코드에서는 환경변수로 참조합니다.

| 분류 | .gitignore 추가 대상 | 코드 내 처리 |
|------|----------------------|-------------|
| 환경변수/로그인 | `cypress.env.json` | `Cypress.env('변수명')` 사용 |
| 테스트 데이터 | `cypress/fixtures/testdata.json` | example 또는 CI secrets 사용 |
| 개인정보 | — (코드에서 제거) | `Cypress.env('변수명')` 사용 |
| 빌드 산출물 | `*.apk`, `apk/` | CI/CD에서 빌드 |
| 계정 정보 | — (코드에서 제거) | `Cypress.env('변수명')` 사용 |

```gitignore
# .gitignore (Public 저장소)
# 민감 파일 — 주석 해제하여 푸시 제외
cypress.env.json
cypress/fixtures/testdata.json
*.apk
apk/
```

### 전환 체크리스트

**Private → Public 전환 시:**
1. `.gitignore`에서 민감 파일 주석 해제
2. 코드 내 하드코딩된 민감정보를 `Cypress.env()` / `process.env`로 교체
3. `cypress.env.example.json` 파일에 플레이스홀더 값 반영
4. `git rm --cached` 로 이미 추적 중인 민감 파일 제거
5. `git diff --cached | grep -iE "password|secret|token|account"` 로 최종 검증

**Public → Private 전환 시:**
1. `.gitignore`에서 민감 파일 항목 주석 처리
2. 필요 시 하드코딩 허용 (단, 환경변수 방식 유지 권장)

---

## 4. 민감정보 상세 분류

### Public 저장소에서 반드시 제거해야 할 항목

| 항목 | 예시 | 처리 방법 |
|------|------|-----------|
| 테스트 계정 ID | `YOUR_USERNAME` | 환경변수 `Cypress.env('username')` |
| 테스트 PIN/비밀번호 | `YOUR_PASSWORD` | 환경변수 `Cypress.env('password')` |
| 회사/조직 코드 | `YOUR_COMPANY_CODE` | 환경변수 `Cypress.env('compCode')` |
| API 키/토큰 | `sk-xxxx`, `token_xxxx` | 환경변수 사용 |
| 실제 환경변수 파일 | `cypress.env.json` | `.gitignore`에 추가 |

### 주의가 필요한 항목

| 항목 | 설명 | 권장 조치 |
|------|------|-----------|
| 앱 패키지 ID | `com.example.app:id` | 환경변수 기본값으로만 사용 |
| 빌드 산출물 파일명 | `App_v1.0.0.apk` | 환경변수로 관리 |
| 디바이스 UDID | 실물 기기 시리얼 | 환경변수 `ANDROID_UDID` |
| UI 덤프 파일 | `ui_dumps/*.xml` | `.gitignore`에 추가 |

---

## 5. Public 저장소용 .gitignore 필수 항목

```gitignore
# 환경변수 / 로그인 (민감정보)
cypress.env.json
.env
.env.local
.env.*.local
!cypress.env.example.json

# Cypress 산출물
cypress/screenshots/
cypress/videos/
cypress/reports/

# 빌드 산출물
apk/
*.apk

# UI 덤프 (앱/화면 구조 정보 포함)
ui_dumps/

# 의존성
node_modules/
```

---

## 6. 환경변수 체크리스트 (Public 저장소 필수)

푸시 전 아래 항목들이 코드에 하드코딩되어 있지 않은지 확인:

- [ ] `loginEnvs.*.username` / `loginEnvs.*.password` - 로그인 테스트 계정
- [ ] `loginEnvs.*.compCode` - 회사/조직 코드 (사용 시)
- [ ] `SMTP_USER` / `SMTP_PASS` - 메일 발송 계정
- [ ] `MAIL_FROM` / `MAIL_TO` - 메일 발신/수신 주소
- [ ] `SPEC_FILE` / `REPEAT_COUNT` - 실행 대상 스펙/반복 횟수

---

## 7. Public 저장소 푸시 전 검증 명령어

```bash
# 민감정보 검색 (계정명, 비밀번호 등)
git diff --cached | grep -iE "password|secret|token|api_key|record_key"

# 하드코딩된 패키지 ID 검색
git diff --cached | grep -E "com\.[a-z]+\.[a-z]+.*:id"

# 환경변수 파일이 스테이징되었는지 확인
git status | grep -E "cypress\.env\.json|\.env"

# 추적되면 안 되는 파일 확인
git ls-files | grep -E "cypress\.env\.json$|\.env$|\.apk$|ui_dumps/"
```

---

## 8. 코드 작성 규칙 (Public 저장소용)

### 올바른 환경변수 사용 패턴 (Cypress)

```javascript
// 민감정보: cypress.env.json(gitignore) 또는 CI secrets에서 주입
const env = Cypress.env('loginEnvs').local;

// 로그인 정보는 환경변수에서만 참조
cy.login('local'); // 내부에서 Cypress.env('loginEnvs') 사용
```

### 올바른 환경변수 사용 패턴 (Node / shell 파이프라인)

```javascript
// shell/visualization.js, generate-summary.mjs 등
const mailFrom = process.env.MAIL_FROM || "";
const mailTo = process.env.MAIL_TO || "";
const specFile = process.env.SPEC_FILE || "cypress/e2e/**/*.cy.js";
```

### 잘못된 예시 (Public 저장소 금지)

```javascript
// BAD: 하드코딩된 민감정보
const username = "YOUR_USERNAME";   // 실제 계정명 하드코딩 금지
const password = "YOUR_PASSWORD";   // 실제 비밀번호 하드코딩 금지
const packageId = "com.example.app.stag:id"; // 실제 패키지 ID 하드코딩 금지
```

---

## 9. 커밋 메시지 규칙

### 기본 형식

```
<type>: <파일/기능1> - <변경내용> / <파일/기능2> - <변경내용>

<한글 상세 설명>
- 변경사항 1
- 변경사항 2
```

### Type 종류

| Type | 설명 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `refactor` | 코드 리팩토링 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정 변경 |
| `style` | 코드 포맷팅 |

### 예시

```
feat: commands.js - cy.login 환경변수 지원 추가 / cypress.env.example.json - 템플릿 생성 / .gitignore - 민감정보 제외

민감정보 환경변수 분리
- 로그인 계정 (username, password) 환경변수화
- 회사 코드, 패키지 ID 환경변수화
- cypress.env.example.json 템플릿 파일 추가
- .gitignore 업데이트 (민감정보 보호)
```

```
fix: sample.dom.cy.js - 타임아웃 증가 / commands.js - 딜레이 추가

로그인 테스트 간헐적 실패 수정
- cy.wait 타임아웃 증가
- 입력 후 딜레이 추가
```

```
docs: GIT_RULES.md - 푸시 규칙 문서 추가

Git 푸시 규칙 문서 추가
- Private/Public 저장소별 보안 정책 정리
- 민감정보 처리 가이드라인 작성
- 커밋 메시지 작성 규칙 추가
```

```
refactor: report 파이프라인 - 요약 export 기능 추가 / sample.iframe.cy.js - 불필요한 로직 제거
```

### 규칙

1. **제목**: `<파일/기능(영문)> - <변경내용(한글)>` 형식, 여러 파일은 `/`로 구분
2. **본문**: 한글 상세 설명, 변경 이유와 내용 포함
3. **빈 줄**: 제목과 본문 사이에 빈 줄 필수

---

## 10. 긴급 조치 (Public 저장소에 민감정보 노출 시)

만약 민감정보가 실수로 커밋된 경우:

```bash
# 1. 즉시 해당 파일 삭제 후 새 커밋
git rm --cached <파일명>
git commit -m "fix: 민감정보 포함 파일 제거"

# 2. 히스토리에서 완전 삭제 (주의: 협업 시 팀원 동기화 필요)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch <파일명>" \
  --prune-empty --tag-name-filter cat -- --all

# 3. 원격 강제 푸시
git push origin --force --all

# 4. 민감정보 즉시 변경 (비밀번호, API 키 등)
# - 노출된 계정 비밀번호 변경
# - 노출된 API 키 / Record Key 재발급
```

> **경고**: Public 저장소에 노출된 민감정보는 이미 복제되었을 수 있습니다.
> 히스토리 삭제와 함께 **반드시 해당 민감정보를 변경**하세요.

---

## 11. 원격 브랜치 상태 확인

원격 저장소의 브랜치 상태를 확인할 때는 **반드시 fetch 후 확인**해야 합니다.

### 주의사항

`git branch -a` 명령어는 로컬에 캐시된 원격 브랜치 정보만 표시합니다.
실제 원격 저장소의 최신 상태와 다를 수 있습니다.

### 올바른 확인 방법

```bash
# 1. 모든 원격 저장소에서 최신 정보 가져오기
git fetch --all

# 2. 원격 브랜치 목록 확인
git branch -a

# 3. 특정 원격 저장소만 fetch
git fetch origin
git fetch <other-remote>
```

### 잘못된 예시

```bash
# BAD: fetch 없이 바로 확인 (오래된 정보일 수 있음)
git branch -a
```

> **주의**: fetch 없이 `git branch -a`를 실행하면 원격에 새로 생성된 브랜치가
> 보이지 않거나, 이미 삭제된 브랜치가 여전히 표시될 수 있습니다.

---

## 12. Example 파일 동기화

원본 파일과 템플릿(example) 파일이 함께 존재하는 경우, **원본 파일의 구조 변경 시 example 파일에도 반영**해야 합니다.

### 대상 파일

| 원본 파일 | 템플릿 파일 | 설명 |
|-----------|-------------|------|
| `cypress.env.json` | `cypress.env.example.json` | 로그인/테스트 환경변수 |

### 규칙

1. **구조 변경 시 동기화 필수**
   - 새 환경변수/키 추가 → example에도 추가 (플레이스홀더 값으로)
   - 환경변수 삭제 → example에서도 삭제
   - 변수명/키 변경 → example에서도 변경

2. **값은 동기화하지 않음**
   - 원본: 실제 민감정보 값
   - example: 플레이스홀더 값 (`YOUR_USERNAME`, `YOUR_PASSWORD`, `https://example.com` 등)

### 체크리스트

- [ ] `cypress.env.json` 구조 변경 시 `cypress.env.example.json`도 수정
- [ ] 새 환경변수는 example에 설명 주석과 함께 추가
- [ ] example 파일은 Git에 커밋 (원본은 .gitignore)

---

## 13. ui_dumps 로그 파일 푸시 정책

`ui_dumps/` 폴더의 XML, 스크린샷 등 로그 파일은 **저장소 유형에 따라 처리 방식이 다릅니다.**

### Private 저장소 (기본)

- `ui_dumps/` 로그 파일을 **Git에 포함하여 푸시 가능**
- 팀 내부에서 UI 분석, 디버깅 이력 공유에 유용하므로 포함 권장

### Public 저장소

- `ui_dumps/` 로그 파일을 **반드시 제외**
- 앱/화면 구조 정보, 화면 요소 정보가 포함되어 있으므로 `.gitignore`에 추가 필수

```gitignore
# Public 저장소 전용 - ui_dumps 제외
ui_dumps/
```

### 판단 기준

| 저장소 이름 예시 | 유형 | ui_dumps 포함 |
|------------------|------|---------------|
| `my-tests` (Private) | Private | 포함 가능 |
| `my-tests-public` | Public | **제외 필수** |

> **요약**: `-public` 등 공개 전용 저장소에만 `ui_dumps/`를 제외하고, Private 저장소에서는 자유롭게 포함하여 푸시합니다.

---

## 14. 커밋 전 파일 무결성 검증 (절단·훼손 방지)

에디터/포매터의 저장(format-on-save) 과정에서 파일 끝이 잘리거나(truncate) 내용이 훼손된 채 커밋되는 사고를 **커밋 전에** 차단한다.

> **배경**: UTF-8+CRLF 테스트 파일이 저장 중 끝부분(닫는 괄호 포함)이 잘린 채 커밋되어 `node --check` 가 실패한 사례가 있었다. 커밋 전 검증 단계가 없으면 이런 사고를 놓칠 수 있다.

### 규칙

1. `git status` 로 **변경(M)·추가된 모든 파일**은 커밋 전에 무결성을 검증한다.
2. 검증은 **스테이징된 내용 기준**으로 한다 — 작업트리 검증과 `git add` 사이에 에디터가 다시 저장해 훼손될 수 있으므로, **`git add` 직후 ~ `git commit` 직전**에 `git show :<파일>`(스테이징본)으로 확인한다.
3. 검증을 통과하지 못하면 **커밋하지 않는다.**

### 검증 항목

| 항목 | 방법 |
|------|------|
| 구문 검증 | JS/TS(ESM `.cy.js` 포함): `node --check`(필요 시 `.mjs`로 복사) · Python: `python -m py_compile` · JSON: `python -m json.tool` |
| 파일 끝 무결성 | `tail -n 3` 으로 마지막 줄·닫는 괄호(`});`, `}`)가 온전한지, 중간에서 잘리지 않았는지 확인 |
| 변경 규모 | `git diff --cached --stat` 으로 줄 수 급변(특히 급감) 점검 · 직전 버전과 `diff` 로 "의도한 변경만"인지 확인 |

### 검증 명령 예시

```bash
git add <파일>

# 구문 검증 (JS ESM 예시) — 실패하면 커밋 금지
git show :<파일> > /tmp/staged.mjs && node --check /tmp/staged.mjs

# 끝부분 + 변경 규모 확인
git show :<파일> | tail -n 3
git diff --cached --stat
```

### 검증 실패 시

1. **커밋 중단.**
2. 정상본 복구 — 백업 또는 직전 커밋(`git checkout HEAD -- <파일>`, `git show <commit>:<파일>`).
3. **훼손 원인 제거** — 해당 파일을 에디터에서 닫거나 format-on-save 비활성화.
4. 정상본을 다시 작성하고 위 검증을 통과한 뒤 커밋한다.

---

## 요약

| 저장소 유형 | 민감정보 스캔 | 민감정보 포함 | 환경변수 분리 | .gitignore (민감파일) | ui_dumps |
|-------------|---------------|---------------|---------------|----------------------|----------|
| **Private** | 불필요 | **모두 허용** | 불필요 | 제외 안 함 | **포함 가능** |
| **Public** | **필수** | **제거 필수** | **필수** | **제외 필수** | **제외 필수** |
