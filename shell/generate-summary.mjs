
// Node 18+
// 목적: mochawesome JSON(.jsons 폴더 내 여러 파일)을 읽어 이메일 본문용 텍스트 요약을 생성
// 출력: 요약 텍스트 파일 (UTF-8)
// 특징:
//  - stats가 있으면 그대로 사용, 없으면 suites/tests를 내려가며 계산
//  - 스펙별 요약 + 전체 합계 + 성공률 + 총 실행시간
//  - 클라우드/녹화 링크는 생성하지 않음(본문 안전)
//  - 한국어 출력
//
// 입출력 경로는 환경변수 또는 CLI 인자로 외부화:
//  - JSON_DIR  : mochawesome .json 들이 모인 폴더 (env JSON_DIR 또는 1번째 인자)
//  - ALT_JSON  : 폴더가 없을 때 대안 단일 파일 (env ALT_JSON 또는 2번째 인자)
//  - OUT_FILE  : 요약 출력 파일 경로 (env OUT_FILE 또는 3번째 인자)
//  기본값은 프로젝트 루트 기준 상대경로로 동작.
//
// 사용 예:
//   node shell/generate-summary.mjs
//   node shell/generate-summary.mjs ./cypress/reports/html/.jsons
//   JSON_DIR=... OUT_FILE=... node shell/generate-summary.mjs

import fs from 'fs/promises';
import path from 'path';

// 프로젝트 루트(스크립트 실행 위치)를 기준으로 경로 해석
const ROOT = process.cwd();
const argv = process.argv.slice(2);

// 우선순위: CLI 인자 > 환경변수 > 기본값(상대경로)
const JSON_DIR = path.resolve(
  ROOT,
  argv[0] || process.env.JSON_DIR || 'cypress/reports/html/.jsons'
);
const ALT_JSON = path.resolve(
  ROOT,
  argv[1] || process.env.ALT_JSON || 'cypress/reports/html/mochawesome.json'
); // 폴더가 없을 때 대안
const OUT_FILE = path.resolve(
  ROOT,
  argv[2] || process.env.OUT_FILE || 'result/result_html.txt'
);
const OUT_DIR = path.dirname(OUT_FILE);

// 디버깅용: 실제 사용 경로 확인
console.log(`[INFO] JSON_DIR: ${JSON_DIR}`);
console.log(`[INFO] ALT_JSON: ${ALT_JSON}`);
console.log(`[INFO] OUT_FILE: ${OUT_FILE}`);

// 유틸
const fmt2 = (n) => String(n).padStart(2, '0');

function secsToHMS(sec) {
  const s = Math.round(sec || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  return (h > 0 ? `${fmt2(h)}:${fmt2(m)}:${fmt2(rem)}` : `${fmt2(m)}:${fmt2(rem)}`);
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function flattenTests(suite) {
  // mochawesome 구조에서 suites/tests를 모두 내려가며 테스트를 평탄화
  const out = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.tests)) {
      for (const t of node.tests) out.push(t);
    }
    if (Array.isArray(node.suites)) {
      for (const s of node.suites) walk(s);
    }
  }
  walk(suite);
  return out;
}

async function readJsonFiles() {
  let files = [];
  try {
    const stats = await fs.stat(JSON_DIR);
    if (stats.isDirectory()) {
      const entries = await fs.readdir(JSON_DIR);
      files = entries
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(JSON_DIR, f));
    }
  } catch (_) {
    // 폴더가 없으면 대안 파일 시도
  }

  if (files.length === 0) {
    try {
      const s = await fs.stat(ALT_JSON);
      if (s.isFile()) files = [ALT_JSON];
    } catch (_) {
      // no files
    }
  }

  if (files.length === 0) {
    throw new Error(`mochawesome JSON을 찾지 못했습니다: ${JSON_DIR} 또는 ${ALT_JSON}`);
  }

  const jsons = [];
  for (const f of files) {
    try {
      const raw = await fs.readFile(f, 'utf8');
      const obj = JSON.parse(raw);
      jsons.push({ file: f, data: obj });
    } catch (e) {
      console.warn(`[WARN] JSON 파싱 실패: ${f} - ${e.message}`);
    }
  }
  if (jsons.length === 0) {
    throw new Error('유효한 mochawesome JSON 파싱 결과가 없습니다.');
  }
  return jsons;
}

function extractSpecsFromJson(json) {
  // mochawesome 파일 하나에서 스펙(리포트 단위) 목록과 stats를 뽑아냄
  // 구조 다양성 대비:
  // - json.stats + json.results[]
  // - json.results[].stats + json.results[].suites
  // - 혹은 json.suites 루트 등
  const specs = [];

  if (Array.isArray(json.results)) {
    for (const res of json.results) {
      const name = res?.suites?.title || res?.fullTitle || res?.file || res?.reportFile || 'unknown spec';
      const tests = flattenTests(res?.suites || res);
      const tTotal = tests.length;
      const tPass = tests.filter((t) => t?.pass === true).length;
      const tFail = tests.filter((t) => t?.fail === true).length;
      const tPending = tests.filter((t) => t?.pending === true).length;
      const tSkipped = tests.filter((t) => t?.skipped === true).length;

      // duration: stats가 있으면 사용, 없으면 tests의 duration 합
      const duration =
        safeNum(res?.stats?.duration) ||
        sum(tests.map((t) => safeNum(t?.duration)));

      specs.push({
        name,
        totals: { tests: tTotal, passes: tPass, failures: tFail, pending: tPending, skipped: tSkipped, duration },
        tests, // 실패 목록 추출용
      });
    }
  } else if (json?.suites) {
    const name = json?.suites?.title || json?.fullTitle || json?.file || 'unknown spec';
    const tests = flattenTests(json.suites);
    const tTotal = tests.length;
    const tPass = tests.filter((t) => t?.pass === true).length;
    const tFail = tests.filter((t) => t?.fail === true).length;
    const tPending = tests.filter((t) => t?.pending === true).length;
    const tSkipped = tests.filter((t) => t?.skipped === true).length;
    const duration =
      safeNum(json?.stats?.duration) ||
      sum(tests.map((t) => safeNum(t?.duration)));
    specs.push({
      name,
      totals: { tests: tTotal, passes: tPass, failures: tFail, pending: tPending, skipped: tSkipped, duration },
      tests,
    });
  } else if (json?.stats) {
    // 최소 stats만 있을 때
    specs.push({
      name: json?.file || 'unknown spec',
      totals: {
        tests: safeNum(json.stats.tests),
        passes: safeNum(json.stats.passes),
        failures: safeNum(json.stats.failures),
        pending: safeNum(json.stats.pending),
        skipped: safeNum(json.stats.skipped),
        duration: safeNum(json.stats.duration),
      },
      tests: [], // 실패 목록 없음
    });
  }

  return specs;
}

function formatSummary(specs) {
  const totals = {
    tests: sum(specs.map((s) => s.totals.tests)),
    passes: sum(specs.map((s) => s.totals.passes)),
    failures: sum(specs.map((s) => s.totals.failures)),
    pending: sum(specs.map((s) => s.totals.pending)),
    skipped: sum(specs.map((s) => s.totals.skipped)),
    duration: sum(specs.map((s) => s.totals.duration)),
  };
  const passRate = totals.tests > 0 ? ((totals.passes / totals.tests) * 100).toFixed(1) : '0.0';

  const lines = [];
  const now = new Date();
  const y = now.getFullYear();
  const m = fmt2(now.getMonth() + 1);
  const d = fmt2(now.getDate());
  const wk = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];

  lines.push(`[Cypress 테스트 결과 요약]`);
  lines.push(`날짜: ${y}.${m}.${d} (${wk})`);
  lines.push(`스펙 수: ${specs.length}`);
  lines.push(`Tests: ${totals.tests} | Passing: ${totals.passes} | Failing: ${totals.failures} | Pending: ${totals.pending} | Skipped: ${totals.skipped}`);
  lines.push(`성공률: ${passRate}%`);
  lines.push(`총 실행 시간: ${secsToHMS(totals.duration)} (${Math.round(totals.duration)}s)`);
  lines.push('');

  if (specs.length > 0) {
    lines.push(`스펙별 요약:`);
    for (const s of specs) {
      lines.push(`- ${s.name}: Passing ${s.totals.passes}, Failing ${s.totals.failures}, Pending ${s.totals.pending}, Skipped ${s.totals.skipped}, Duration ${secsToHMS(s.totals.duration)}`);
    }
    lines.push('');
  }

  // 실패 상세(최대 10개)
  const failedTests = [];
  for (const s of specs) {
    for (const t of s.tests || []) {
      if (t?.fail === true || t?.state === 'failed') {
        failedTests.push({
          spec: s.name,
          title: Array.isArray(t?.title) ? t.title.join(' > ') : (t?.fullTitle || t?.title || '(제목 없음)'),
          duration: safeNum(t?.duration),
          err: (t?.err && (t.err.message || t.err.stack || t.err)) || '',
        });
      }
    }
  }
  if (failedTests.length > 0) {
    lines.push(`실패 테스트(최대 10개):`);
    for (const ft of failedTests.slice(0, 10)) {
      const firstErrLine = String(ft.err).split('\n')[0];
      lines.push(`- [${ft.spec}] ${ft.title} (${secsToHMS(ft.duration)}): ${firstErrLine}`);
    }
    lines.push('');
  } else {
    lines.push(`실패 테스트: 없음 ✅`);
    lines.push('');
  }

  lines.push(`※ 자세한 HTML 리포트는 첨부 index.html을 확인하세요.`);
  // NOTE: 클라우드 대시보드 링크 및 "Recorded Run:" 관련 라인은 생성하지 않음

  return lines.join('\n');
}

async function main() {
  const jsons = await readJsonFiles();
  const allSpecs = [];
  for (const { file, data } of jsons) {
    const specs = extractSpecsFromJson(data);
    if (specs.length === 0) {
      console.warn(`[WARN] 스펙 정보가 비어있습니다: ${file}`);
    }
    allSpecs.push(...specs);
  }

  const summary = formatSummary(allSpecs);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, summary, 'utf8');

  console.log(`Summary written: ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(`[ERROR] 요약 생성 실패: ${e.message}`);
  process.exit(1);
});
