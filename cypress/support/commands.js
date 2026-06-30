// ***********************************************
// 커스텀 커맨드 정의 파일.
// 참고: https://on.cypress.io/custom-commands
// ***********************************************

const dataTransfer = new DataTransfer(); // 드래그앤드롭용 dataTransfer 객체

// 드래그앤드롭 헬퍼 — 요소를 좌표로 끌어다 놓는다
Cypress.Commands.add('ModuleAdd', (select, target, x_coordinate, y_coordinate) => {
    cy.get(select).trigger('dragstart', { dataTransfer, button: 0, force: true }).trigger('dragover', { clientX: 100, clientY: 100 });
    cy.get(target).trigger('drop', {
        dataTransfer,
        which: 1,
        pageX: x_coordinate,
        pageY: y_coordinate,
        force: true,
    });
});

// 쿠키/로컬/세션 스토리지 일괄 조회 헬퍼
Cypress.Commands.add('getAll', () => {
    cy.getAllCookies();
    cy.getAllLocalStorage();
    cy.getAllSessionStorage();
});

// 날짜 헬퍼 (한국 시간 기준) — 파일명/리포트 타임스탬프 등에 사용
Cypress.getDate = () => {
    const d = new Date();
    const kr = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    const yy = String(kr.getFullYear()).slice(-2);
    const mm = String(kr.getMonth() + 1).padStart(2, '0');
    const dd = String(kr.getDate()).padStart(2, '0');
    const HH = String(kr.getHours()).padStart(2, '0');
    const MM = String(kr.getMinutes()).padStart(2, '0');
    const SS = String(kr.getSeconds()).padStart(2, '0');

    return {
        yymmdd: `${yy}${mm}${dd}`,                          // 260109
        yy_mm_dd: `${yy}_${mm}_${dd}`,                      // 26_01_09
        yy_mm_dd_dash: `${yy}-${mm}-${dd}`,                 // 26-01-09
        yyyy_mm_dd: `${kr.getFullYear()}_${mm}_${dd}`,      // 2026_01_09
        yyyy_mm_dd_dash: `${kr.getFullYear()}-${mm}-${dd}`, // 2026-01-09
        yymmdd_HHMM: `${yy}${mm}${dd}_${HH}${MM}`,          // 260109_1654
        yymmdd_HHMMSS: `${yy}${mm}${dd}_${HH}${MM}${SS}`,   // 260109_165412
    };
};

// 로그인 커맨드 — 환경별 설정(loginEnvs)에서 URL/셀렉터/성공판정을 주입받는다.
//   cypress.env.json 의 loginEnvs 를 채워 사용 (cypress.env.example.json 참고).
//   cy.login()            // 기본 환경 (config의 loginEnv, 기본 'local')
//   cy.login('iframeLegacy')  // 특정 환경 지정
Cypress.Commands.add('login', (env) => {
    const envs = Cypress.env('loginEnvs') || {};
    const name = env || Cypress.env('loginEnv') || 'local';
    const cfg = envs[name];
    expect(cfg, `로그인 환경 '${name}' 설정 존재 (가능: ${Object.keys(envs).join(', ')})`).to.exist;

    const sel = cfg.selectors || {};
    const vp = cfg.viewport || { width: 1920, height: 1080 };

    cy.viewport(vp.width, vp.height);
    cy.visit(cfg.url);

    cy.get(sel.username).type(cfg.username);
    cy.get(sel.password).type(cfg.password, { log: false }); // 비밀번호는 커맨드 로그에 남기지 않음

    // 회사코드 등 추가 필드 — 셀렉터와 값이 모두 있을 때만 입력 (일반 SPA는 보통 불필요)
    if (sel.compCode && cfg.compCode) {
        cy.get(sel.compCode).type(cfg.compCode);
    }

    cy.get(sel.submit).click();

    // 로그인 성공 판정 — 설정된 것만 검증 (URL 리다이렉트 / 로그인 후에만 보이는 요소)
    if (cfg.successUrl) {
        cy.url({ timeout: 20000 }).should('include', cfg.successUrl);
    }
    if (cfg.successSelector) {
        cy.get(cfg.successSelector, { timeout: 20000 }).should('be.visible');
    }
    cy.log(`## 로그인 (${name}) ##`);
});
