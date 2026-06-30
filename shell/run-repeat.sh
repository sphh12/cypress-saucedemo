#!/bin/bash
# Cypress 반복 러너 (cypress-repeat)
# 동일 스펙을 REPEAT_COUNT 회 반복 실행하여 플래키(간헐 실패) 테스트를 진단하는 용도.
#
# 사용 환경변수 (모두 선택, 기본값 있음):
#   SPEC_FILE       실행할 스펙 glob (기본: cypress/e2e/**/*.cy.js)
#   REPEAT_COUNT    반복 횟수 (기본: 3)
#   CI              "true" 또는 Docker 환경이면 Xvfb(:99) 가상 디스플레이를 띄움
#   ENABLE_REPORT   "true"면 shell/visualization.js 로 HTML 리포트 생성
#   ENABLE_MAIL     "true"면 shell/curl.sh 로 결과 메일 발송
#
# 메일/리포트 관련 SMTP_* / MAIL_FROM / MAIL_TO 등은 shell/curl.sh 가 읽는다.

set -u

echo "=== Cypress 반복 테스트 시작 ==="

# 입력값 기본 설정
SPEC_FILE="${SPEC_FILE:-cypress/e2e/**/*.cy.js}"
REPEAT_COUNT="${REPEAT_COUNT:-3}"

# 결과 디렉터리 (상대경로 — 절대경로/외부 동기화 의존 없음)
RESULT_DIR="${RESULT_DIR:-./result}"
mkdir -p "$RESULT_DIR"

# Cypress 바이너리 설치 보증 (Docker/CI 의 클린 환경 대비)
npx cypress install

# ---------------------------------------------------------------------------
# Linux/Docker 에서는 헤드리스 브라우저용 가상 디스플레이(Xvfb)가 필요.
# run-sample.sh 의 Xvfb 스니펫을 흡수했다. macOS/Windows 로컬에서는 건너뛴다.
# ---------------------------------------------------------------------------
if [ "${CI:-}" = "true" ] || [ -f "/.dockerenv" ]; then
  if command -v Xvfb >/dev/null 2>&1; then
    echo "=== Xvfb 가상 디스플레이 시작 (:99) ==="
    Xvfb :99 -screen 0 1920x1080x24 >/dev/null 2>&1 &
    export DISPLAY=:99
    # Xvfb 가 소켓을 열 때까지 잠깐 대기
    sleep 2
  else
    echo "=== Xvfb 미설치 — 가상 디스플레이 없이 진행 ==="
  fi
fi

echo "=== Cypress 반복 테스트 실행 ==="
echo "실행 스펙   : $SPEC_FILE"
echo "반복 횟수   : ${REPEAT_COUNT}회"

# NO_COLOR=1: 로그를 텍스트 파일로 떨어뜨릴 때 ANSI 색상코드 제거
RAW_LOG="${RESULT_DIR}/origin.txt"
NO_COLOR=1 npx cypress-repeat run \
  -n "$REPEAT_COUNT" \
  --spec "$SPEC_FILE" \
  --config specPattern="$SPEC_FILE" \
  --browser chrome \
  --headless 2>&1 | tee "$RAW_LOG" || true

# 'Run Finished' 이후 요약 부분만 추출 (메일 본문/리포트 입력으로 사용)
SUMMARY_LOG="${RESULT_DIR}/result.txt"
sed -n '/Run Finished/,$p' "$RAW_LOG" > "$SUMMARY_LOG"

# ---------------------------------------------------------------------------
# (선택) HTML 리포트 생성 — 입력/출력 경로는 환경변수로 주입 (절대경로 하드코딩 없음)
# ---------------------------------------------------------------------------
if [ "${ENABLE_REPORT:-false}" = "true" ]; then
  echo "=== HTML 리포트 생성 (visualization.js) ==="
  HTML_OUT="${RESULT_DIR}/result_html.txt"
  : > "$HTML_OUT"
  REPORT_INPUT="$SUMMARY_LOG" REPORT_OUTPUT="$HTML_OUT" node ./shell/visualization.js || true
fi

# ---------------------------------------------------------------------------
# (선택) 결과 메일 발송 — 발신/수신/SMTP 정보는 curl.sh 가 env 로 읽음
# ---------------------------------------------------------------------------
if [ "${ENABLE_MAIL:-false}" = "true" ]; then
  echo "=== 결과 메일 발송 (curl.sh) ==="
  if [ -f "${RESULT_DIR}/result_html.txt" ]; then
    export file_content="$(cat "${RESULT_DIR}/result_html.txt")"
  else
    export file_content="$(cat "$SUMMARY_LOG")"
  fi
  export date="$(date +"%Y.%m.%d (%a)")"
  export subject="자동화 반복 테스트 결과 (${REPEAT_COUNT}회)"
  export environment="${ENVIRONMENT:-Repeat}"
  sh ./shell/curl.sh || true
fi

echo "=== 반복 테스트 완료 ==="
