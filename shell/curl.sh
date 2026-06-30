#!/bin/bash

email_body_file=$(mktemp)

# 리포트 링크 가져오기
REPORT_LINK="${report_link:-}"

if [ -n "$REPORT_LINK" ]; then
    LINK_SECTION="<br><br><p><strong>📎 상세 HTML 리포트 다운로드:</strong></p><p><a href=\"$REPORT_LINK\">$REPORT_LINK</a></p>"
else
    LINK_SECTION=""
fi

# 발신/수신 주소는 환경변수로 주입 (하드코딩 금지)
MAIL_FROM="${MAIL_FROM}"
MAIL_TO="${MAIL_TO}"

cat <<EOF > $email_body_file
From: $MAIL_FROM
To: $MAIL_TO
Subject: [$environment] $subject - $date
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

$file_content

$LINK_SECTION

EOF

SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-$MAIL_FROM}"
SMTP_PASS="${SMTP_PASS}"

echo "SMTP 서버: $SMTP_HOST:$SMTP_PORT"
echo "이메일 크기: $(wc -c < $email_body_file) bytes"

# MAIL_TO 가 여러 수신자(콤마 구분)일 수 있으므로 --mail-rcpt 인자를 동적으로 구성
rcpt_args=()
IFS=',' read -ra rcpt_list <<< "$MAIL_TO"
for rcpt in "${rcpt_list[@]}"; do
    # 앞뒤 공백 제거
    rcpt_trimmed=$(echo "$rcpt" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [ -n "$rcpt_trimmed" ]; then
        rcpt_args+=(--mail-rcpt "$rcpt_trimmed")
    fi
done

# curl verbose 로그를 변수에 캡처(화면에도 그대로 출력) + 종료코드 보존
curl_log=$(curl -v --url "smtp://${SMTP_HOST}:${SMTP_PORT}" --ssl-reqd --mail-from "$MAIL_FROM" "${rcpt_args[@]}" --user "${SMTP_USER}:${SMTP_PASS}" --upload-file "$email_body_file" --max-time 120 --connect-timeout 30 2>&1)
curl_exit=$?

echo "$curl_log"
rm "$email_body_file"

# 성공/실패 판정: curl 종료코드 0 = 발송 성공, 그 외 = 실패
if [ "$curl_exit" -eq 0 ]; then
    echo "✅ 이메일 발송 완료!"
else
    echo "❌ 이메일 발송 실패! (curl exit code: $curl_exit)"
    # SMTP 서버가 반환한 4xx/5xx 에러 응답 라인 표시(원인 파악용)
    smtp_err=$(echo "$curl_log" | grep -E '^< [45][0-9][0-9]' | tail -n 3)
    if [ -n "$smtp_err" ]; then
        echo "   ↳ SMTP 응답:"
        echo "$smtp_err" | sed 's/^/     /'
    fi
    # 자주 나오는 종료코드별 원인 힌트
    case "$curl_exit" in
        67) echo "   ↳ 원인: 인증 거부(535). .env의 SMTP_PASS(메일 앱 비밀번호) 만료/변경 여부 확인 필요." ;;
        28) echo "   ↳ 원인: 타임아웃(연결/전송 시간 초과). 네트워크·방화벽 확인." ;;
        6)  echo "   ↳ 원인: 호스트 해석 실패. SMTP_HOST 값 또는 DNS 확인." ;;
        7)  echo "   ↳ 원인: 서버 연결 실패. SMTP_PORT/방화벽 확인." ;;
    esac
fi
