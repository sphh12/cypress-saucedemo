// Cypress 'Run Finished' 텍스트(또는 mochawesome 요약)를 이메일용 HTML 표로 변환하는 스크립트
// - 입력/출력 경로는 환경변수 또는 CLI 인자로 주입 (하드코딩 금지)
//   INPUT_FILE  (또는 1번째 인자): Cypress run 출력이 저장된 텍스트 파일 (기본 ./result/result.txt)
//   OUTPUT_FILE (또는 2번째 인자): 생성할 HTML 파일 (기본 ./result/result_html.txt)
//   REPORT_PATH : record 모드가 아닐 때 표시할 로컬 리포트 경로 (선택)

const fs = require('fs');

// 입력/출력 경로: CLI 인자 우선, 없으면 환경변수, 그래도 없으면 기본값
const inputFile = process.argv[2] || process.env.INPUT_FILE || './result/result.txt';
const outputFile = process.argv[3] || process.env.OUTPUT_FILE || './result/result_html.txt';

// 입력 파일 안전 읽기 (없으면 빈 문자열)
const data = fs.existsSync(inputFile) ? fs.readFileSync(inputFile, 'utf8') : '';
const lines = data ? data.split('\n') : [];

// Cypress 'Run Finished' 요약 표는 보통 헤더 라인 이후부터 시작 → 5번째 줄부터 파싱
let index = 5;

// 숫자 파싱 헬퍼: 숫자가 아니면 '-' 반환 (빈 셀 방지)
const num = (s) => (isNaN(parseInt(s, 10)) ? '-' : parseInt(s, 10));

// Cypress run 출력 텍스트 → 결과 행 배열로 파싱
const parseData = (lines) => {
  const results = [];

  // 스펙별 결과 라인 파싱 (박스 문자 '│'로 구분된 10개 컬럼 형태)
  while (index < lines.length) {
    const line = lines[index].trim();
    if (line) {
      const parts = line.split(/\s+/);
      // 형식이 맞지 않으면 표 영역이 끝난 것으로 보고 중단
      if (parts.length != 10 || parts[0] != '│') {
        break;
      }
      results.push({
        pf: parts[1],
        spec: parts[2],
        time: parts[3],
        tests: num(parts[4]),
        passing: num(parts[5]),
        failing: num(parts[6]),
        pending: num(parts[7]),
        skipped: num(parts[8]),
      });
    }
    index += 2; // 결과 라인 사이에 구분선이 있어 2칸씩 이동
  }

  // 합계(All specs) 라인 파싱 (있을 때만, 2칸 이상 공백으로 분리)
  if (index < lines.length) {
    const result_line = lines[index].trim();
    if (result_line) {
      const parts = result_line.split(/\s{2,}/);
      results.push({
        pf: parts[0],
        spec: parts[1],
        time: parts[2],
        tests: num(parts[3]),
        passing: num(parts[4]),
        failing: num(parts[5]),
        pending: num(parts[6]),
        skipped: num(parts[7]),
      });
    }
  }

  // Cypress Cloud 'Recorded Run' 링크 라인 (record 모드일 때만 존재)
  let recorded_line = index + 5 < lines.length ? lines[index + 5].trim() : '';

  // record 모드가 아니면 로컬 리포트 경로 표시 (REPORT_PATH 환경변수)
  const reportPath = process.env.REPORT_PATH || '';
  if (!recorded_line && reportPath) {
    recorded_line = `__LOCAL_REPORT__${reportPath}`;
  }

  return { results, recorded_line };
};

// HTML 템플릿 생성
const generateHTML = (results, recorded_line) => {
  let linkHTML = '';

  // 케이스 1: Cypress Cloud (record 모드 — "Recorded Run: https://..." 존재)
  if (recorded_line && !recorded_line.startsWith('__LOCAL_REPORT__')) {
    const href = recorded_line.split(/\s+/)[2] || '#';
    linkHTML = `<p style="color:#555; font-size:14px;">Cypress Cloud: <a href="${href}" target="_blank">${href}</a></p>`;
  }
  // 케이스 2: 로컬 리포트 경로 표기 (record 모드 아님)
  else if (recorded_line.startsWith('__LOCAL_REPORT__')) {
    const localPath = recorded_line.replace('__LOCAL_REPORT__', '');
    linkHTML = `<p style="color:#555; font-size:14px;">Mochawesome Report: <strong>${localPath}</strong></p>`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cypress Test Results</title>
  <style>
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
    .passed {
      color: green;
    }
    .failed {
      color: red;
    }
  </style>
</head>
<body>
  <h1>Cypress Test Results</h1>
  <table>
    <tr style="background-color: #f2f2f2;">
      <th>P/F</th>
      <th>Spec</th>
      <th>Time</th>
      <th>Tests</th>
      <th>Passing</th>
      <th>Failing</th>
      <th>Pending</th>
      <th>Skipped</th>
    </tr>
    ${results
      .map(
        (result, idx) => `
    <tr style="background-color: ${idx === results.length - 1 ? '#f2f2f2' : 'transparent'};">
      <td>${result.pf}</td>
      <td>${result.spec}</td>
      <td>${result.time}</td>
      <td>${result.tests}</td>
      <td>${result.passing}</td>
      <td>${result.failing}</td>
      <td>${result.pending}</td>
      <td>${result.skipped}</td>
    </tr>
    `,
      )
      .join('')}
  </table>
  ${linkHTML}
</body>
</html>
`;
};

// HTML 파일 작성
const { results, recorded_line } = parseData(lines); // 반환된 객체를 구조분해 할당
const html = generateHTML(results, recorded_line);
fs.writeFileSync(outputFile, html);

// 디버깅용 로그
console.log('HTML file generated:', outputFile, 'bytes=', Buffer.byteLength(html));
