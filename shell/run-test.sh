#!/bin/sh
# Cypress E2E 메인 러너 스크립트 (POSIX sh 호환)
#
# 사용법:
#   SPEC_FILE="cypress/e2e/sample/sample.dom.cy.js" sh shell/run-test.sh
#
# 동작 개요:
#   1) Linux/Docker 환경이면 Xvfb(가상 디스플레이 :99) 시작
#   2) npx cypress run --spec "$SPEC_FILE" 실행
#   3) (선택) node shell/visualization.js 로 이메일용 HTML 리포트 생성
#   4) (선택) SMTP_* / MAIL_* 환경변수가 있으면 sh shell/curl.sh 로 메일 발송
#
# 환경변수:
#   SPEC_FILE          실행할 스펙 (기본값: cypress/e2e/**/*.cy.js)
#   CYPRESS_RECORD_KEY (선택) record 모드 사용 시 Cypress Cloud 키
#   SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS  (선택) 메일 발송 설정
#   MAIL_FROM/MAIL_TO  (선택) 메일 발신/수신 주소

set -e

echo "=== Cypress 테스트 시작 ==="

# 실행할 스펙 파일 (미지정 시 전체 스펙)
SPEC_FILE="${SPEC_FILE:-cypress/e2e/**/*.cy.js}"

# 결과물 디렉터리 (상대경로 — 절대경로 사용 금지)
mkdir -p result

# --- Linux/Docker 환경: Xvfb 가상 디스플레이 시작 ---
# 헤드리스가 아닌 --headed 실행이나 일부 렌더링에 디스플레이가 필요할 때 사용.
# (run-sample.sh 의 Xvfb 스니펫 흡수)
if [ -f /.dockerenv ] || [ "$(uname)" = "Linux" ]; then
    echo "=== Linux/Docker 환경 감지: Xvfb 시작 ==="
    if command -v Xvfb >/dev/null 2>&1; then
        # 이전 실행에서 남은 lock 파일 정리
        rm -f /tmp/.X99-lock
        Xvfb :99 -screen 0 1920x1080x24 &
        export DISPLAY=:99
        sleep 1  # Xvfb 초기화 대기
        echo "Xvfb 시작 완료 (DISPLAY=$DISPLAY)"
    else
        echo "경고: Xvfb 가 설치되어 있지 않습니다. (헤드리스 실행은 정상 동작)"
    fi
fi

echo "=== Cypress 테스트 실행 ==="
echo "실행 스펙 : $SPEC_FILE"

# [record 모드 예시] CYPRESS_RECORD_KEY 가 있으면 아래 주석을 참고해 record 실행 가능
# NO_COLOR=1 npx cypress run --record --key "$CYPRESS_RECORD_KEY" --spec "$SPEC_FILE" 2>&1 | tee ./result/orign.txt || true
NO_COLOR=1 npx cypress run --spec "$SPEC_FILE" 2>&1 | tee ./result/orign.txt || true

# Cypress 'Run Finished' 이후 요약 부분만 추출
sed -n '/Run Finished/,$p' ./result/orign.txt > ./result/result.txt

# === [선택] 리포트 생성 단계 =========================================
# visualization.js 가 있으면 이메일용 HTML 표를 생성한다.
# 입출력 경로는 환경변수로 전달 (절대경로 하드코딩 금지).
if [ -f ./shell/visualization.js ]; then
    echo "=== [선택] HTML 리포트 생성 ==="
    : > ./result/result_html.txt
    export RESULT_INPUT="${RESULT_INPUT:-./result/result.txt}"
    export RESULT_OUTPUT="${RESULT_OUTPUT:-./result/result_html.txt}"
    node ./shell/visualization.js || echo "경고: 리포트 생성 실패 (건너뜀)"
fi

# === [선택] 메일 발송 단계 ===========================================
# SMTP_* 와 MAIL_FROM/MAIL_TO 환경변수가 모두 설정되어 있고 curl.sh 가
# 존재할 때만 메일을 발송한다. 하나라도 없으면 조용히 건너뛴다.
if [ -f ./shell/curl.sh ] && \
   [ -n "$SMTP_HOST" ] && [ -n "$SMTP_USER" ] && [ -n "$SMTP_PASS" ] && \
   [ -n "$MAIL_FROM" ] && [ -n "$MAIL_TO" ]; then
    echo "=== [선택] 이메일 발송 ==="
    # curl.sh 가 참조하는 메일 본문/메타 정보
    if [ -f ./result/result_html.txt ]; then
        export file_content="$(cat ./result/result_html.txt)"
    else
        export file_content="$(cat ./result/result.txt 2>/dev/null || true)"
    fi
    export date="$(date +"%Y.%m.%d")"
    export subject="${MAIL_SUBJECT:-자동화 테스트 결과}"
    export environment="${ENVIRONMENT:-CI}"
    sh ./shell/curl.sh || echo "경고: 메일 발송 실패 (건너뜀)"
else
    echo "=== [선택] 메일 발송 건너뜀 (SMTP_*/MAIL_* 미설정) ==="
fi

echo "=== 테스트 완료 ==="
