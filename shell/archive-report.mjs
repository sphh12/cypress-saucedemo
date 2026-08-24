#!/usr/bin/env node
/**
 * Cypress HTML 리포트를 타임스탬프 폴더로 보관하는 스크립트 (실행 이력 관리).
 *
 * mochawesome 리포트는 매 실행마다 cypress/reports/html/index.html 을 덮어쓰기 때문에
 * 직전 실행 결과만 남는다. 이 스크립트는 실행 직후 리포트 폴더 전체를
 * cypress-history/<타임스탬프>/ 로 복사해 과거 실행 결과를 누적 보관한다.
 *
 * 사용법:
 *   node shell/archive-report.mjs                 # 직전 실행 리포트만 보관 (폴더명: 시각만)
 *   node shell/archive-report.mjs --run           # 테스트 실행 후 보관 (폴더명에 _pass/_fail)
 *   node shell/archive-report.mjs --run --spec "cypress/e2e/saucedemo/cart.cy.js"
 *                                                 # --run 뒤 인자는 cypress 로 그대로 전달
 *
 * 환경변수:
 *   HISTORY_DIR    보관 위치 (기본: ./cypress-history)
 *   HISTORY_KEEP   최근 N개만 유지 (미지정 시 전부 유지)
 *
 * 종료 코드: 테스트 종료 코드를 그대로 전파한다.
 *            테스트가 통과했더라도 보관에 실패하면 1 을 반환한다(CI 에서 감지 가능).
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const REPORT_DIR = path.resolve('cypress/reports/html');
const REPORT_ENTRY = path.join(REPORT_DIR, 'index.html');
const HISTORY_DIR = path.resolve(process.env.HISTORY_DIR || 'cypress-history');

// 이 스크립트가 만든 보관 폴더명 패턴 (정리 대상 판별용)
const ARCHIVE_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}_\d{6}(_(pass|fail))?(-\d+)?$/;

// --run 이 있으면 그 뒤의 인자는 모두 cypress 실행 옵션으로 넘긴다
const argv = process.argv.slice(2);
const runIdx = argv.indexOf('--run');
const shouldRun = runIdx !== -1;
const cypressArgs = shouldRun ? argv.slice(runIdx + 1) : [];

// --run 앞에 붙은 인자는 cypress 로 전달되지 않는다 → 조용히 무시하지 않고 경고
const ignoredArgs = shouldRun ? argv.slice(0, runIdx) : argv;
if (ignoredArgs.length > 0) {
    console.warn(`[archive] 무시된 인자: ${ignoredArgs.join(' ')}`);
    console.warn('[archive] cypress 로 넘길 옵션은 --run 뒤에 붙이세요. 예: --run --spec "cypress/e2e/..."');
}

// 보관 폴더명에 쓸 로컬 시각 (YYYY-MM-DD_HHmmss)
const pad = (n) => String(n).padStart(2, '0');
function timestamp(d) {
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    );
}

/** 테스트 실행 (성공/실패 코드를 그대로 반환) */
function runCypress(extraArgs) {
    // npx/.bin 래퍼(.cmd)는 Windows Node 20+ 에서 spawn 이 차단(EINVAL)되므로
    // cypress CLI 엔트리를 node 로 직접 실행한다 (플랫폼 무관, shell 불필요).
    let cli;
    try {
        const require = createRequire(import.meta.url);
        cli = path.join(path.dirname(require.resolve('cypress/package.json')), 'bin', 'cypress');
    } catch {
        console.error('[archive] cypress 모듈을 찾을 수 없습니다. npm install 을 먼저 실행하세요.');
        return 1;
    }

    // --browser 를 직접 지정하지 않았으면 npm test 와 동일하게 chrome 을 기본값으로 쓴다
    // (지정 없이 cypress 에 넘기면 내장 Electron 으로 실행되어 npm test 와 결과가 달라진다)
    const hasBrowser = extraArgs.some((a) => a === '--browser' || a === '-b' || a.startsWith('--browser='));
    const args = [cli, 'run', ...extraArgs, ...(hasBrowser ? [] : ['--browser', 'chrome'])];
    console.log(`[archive] 테스트 실행: node ${args.join(' ')}`);

    const res = spawnSync(process.execPath, args, { stdio: 'inherit' });

    if (res.error) {
        console.error(`[archive] cypress 실행 실패: ${res.error.message}`);
        return 1;
    }
    return res.status ?? 1;
}

/**
 * 리포트 폴더를 타임스탬프 폴더로 복사 → 생성된 경로 반환 (실패 시 null)
 * @param {string} statusSuffix 폴더명 뒤에 붙일 상태 ('_pass' | '_fail' | '')
 * @param {number|null} minMtimeMs 이 시각 이후에 생성된 리포트만 허용 (null 이면 검사 생략)
 */
function archiveReport(statusSuffix, minMtimeMs) {
    if (!fs.existsSync(REPORT_ENTRY)) {
        console.error(`[archive] 보관할 리포트가 없습니다: ${REPORT_ENTRY}`);
        console.error('[archive] 먼저 테스트를 실행하세요 (npm test) 또는 --run 옵션을 사용하세요.');
        return null;
    }

    const { mtimeMs } = fs.statSync(REPORT_ENTRY);
    console.log(`[archive] 리포트 생성 시각: ${new Date(mtimeMs).toLocaleString('ko-KR')}`);

    // --run 모드에서 이번 실행이 리포트를 남기지 않았다면(실행 자체 실패·스펙 0건 등)
    // 직전 실행 리포트가 이번 결과로 오인되어 보관되는 것을 막는다.
    // 파일시스템 시각 해상도를 감안해 2초 여유를 둔다.
    if (minMtimeMs !== null && mtimeMs < minMtimeMs - 2000) {
        console.error('[archive] 이번 실행은 리포트를 생성하지 않았습니다 (직전 실행 리포트만 존재).');
        console.error('[archive] 잘못된 이력이 쌓이지 않도록 보관을 건너뜁니다.');
        return null;
    }

    // 같은 초에 두 번 실행되면 -2, -3 … 을 붙여 덮어쓰기를 막는다
    const base = timestamp(new Date()) + statusSuffix;
    let dest = path.join(HISTORY_DIR, base);
    for (let i = 2; fs.existsSync(dest); i++) {
        dest = path.join(HISTORY_DIR, `${base}-${i}`);
    }

    // 복사 중 실패한 반쪽 폴더가 정상 이력으로 남지 않도록 .partial 로 복사한 뒤 rename 한다
    // (.partial 은 ARCHIVE_NAME_PATTERN 에 안 걸리므로 정리 대상에도 포함되지 않는다)
    const tmp = `${dest}.partial`;
    try {
        fs.mkdirSync(HISTORY_DIR, { recursive: true });
        fs.rmSync(tmp, { recursive: true, force: true });
        fs.cpSync(REPORT_DIR, tmp, { recursive: true });
        fs.renameSync(tmp, dest);
    } catch (e) {
        console.error(`[archive] 리포트 보관 실패: ${e.message}`);
        try {
            fs.rmSync(tmp, { recursive: true, force: true });
        } catch {
            /* 정리 실패는 무시 — 원인 에러가 이미 출력됨 */
        }
        return null;
    }

    console.log(`[archive] 리포트 보관 완료: ${dest}`);
    return dest;
}

/** HISTORY_KEEP 이 지정된 경우 오래된 보관 폴더 정리 */
function pruneHistory() {
    const raw = process.env.HISTORY_KEEP;
    if (raw === undefined || raw === '') return; // 미지정 → 전부 유지

    const keep = Number(raw);
    if (!Number.isInteger(keep) || keep <= 0) {
        console.warn(`[archive] HISTORY_KEEP 값이 올바르지 않아 정리를 건너뜁니다: ${raw}`);
        return;
    }

    let names;
    try {
        names = fs
            .readdirSync(HISTORY_DIR, { withFileTypes: true })
            .filter((e) => e.isDirectory() && ARCHIVE_NAME_PATTERN.test(e.name))
            // 리포트가 실제로 들어있는 폴더만 삭제 대상 — 다른 도구/사용자가 만든
            // 같은 형식의 폴더를 지우지 않기 위한 안전장치
            .filter((e) => fs.existsSync(path.join(HISTORY_DIR, e.name, 'index.html')))
            .map((e) => e.name)
            .sort()
            .reverse(); // 최신순 (타임스탬프가 고정폭이라 문자열 정렬 = 시간 정렬)
    } catch (e) {
        console.warn(`[archive] 이력 목록을 읽지 못해 정리를 건너뜁니다: ${e.message}`);
        return;
    }

    for (const name of names.slice(keep)) {
        try {
            fs.rmSync(path.join(HISTORY_DIR, name), {
                recursive: true,
                force: true,
                maxRetries: 3,
                retryDelay: 200,
            });
            console.log(`[archive] 오래된 이력 삭제 (HISTORY_KEEP=${keep}): ${name}`);
        } catch (e) {
            // Windows 에서 리포트/비디오가 열려 있으면 삭제가 실패한다(EBUSY).
            // 통과한 실행을 실패로 만들지 않도록 경고만 남기고 계속 진행한다.
            console.warn(`[archive] 이력 삭제 실패, 건너뜁니다 (${name}): ${e.message}`);
        }
    }
}

// ── main ──────────────────────────────────────────────────────────────
let exitCode = 0;
let suffix = '';
let startedAt = null;

if (shouldRun) {
    startedAt = Date.now();
    exitCode = runCypress(cypressArgs);
    // 테스트가 실패해도 보관은 수행한다 (실패 이력이 오히려 중요)
    suffix = exitCode === 0 ? '_pass' : '_fail';
    console.log(`[archive] 테스트 종료 코드: ${exitCode} (${exitCode === 0 ? '통과' : '실패'})`);
}

const dest = archiveReport(suffix, startedAt);
if (dest) {
    pruneHistory();
    console.log(`[archive] 열어보기: ${path.join(dest, 'index.html')}`);
} else if (exitCode === 0) {
    exitCode = 1; // 보관 실패를 '성공'으로 보고하지 않는다
}

// process.exit() 대신 exitCode 지정 — 파이프로 연결된 로그가 잘리는 것을 막는다
process.exitCode = exitCode;
