// ***********************************************************
// support/e2e.js — 모든 테스트 파일 실행 전 자동으로 로드된다.
// 전역 설정/플러그인 등록 위치.
// 참고: https://on.cypress.io/configuration
// ***********************************************************

require('./commands');

// 사용 중인 플러그인 — 프로젝트에서 쓰지 않는 것은 제거해도 된다.
require('typescript');
require('cypress-iframe');
require('cypress-clipboard');
require('cypress-xpath');
require('cypress-mochawesome-reporter/register');
require('cypress-real-events');

// ## 특정 uncaught 예외 무시 (앱 코드에서 나오는, 테스트와 무관한 예외) ##
// 프로젝트에서 실제로 발생하는 메시지 일부를 여기에 추가하세요.
Cypress.on('uncaught:exception', (err, runnable) => {
    const msg = (err && err.message) ? err.message : '';

    const IGNORED_PATTERNS = [
        // 예: 'ResizeObserver loop limit exceeded',
        // 예: 'Script error',
    ];

    const shouldIgnore = IGNORED_PATTERNS.some((pat) => msg.includes(pat));

    if (shouldIgnore) {
        return false; // 무시 (테스트 실패시키지 않음)
    }
    // 그 외 예외는 그대로 테스트를 실패시킨다 (기본 동작)
});
