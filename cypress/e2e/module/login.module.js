// 일반 SPA 로그인 헬퍼 (함수형) — cy.login 커스텀 커맨드의 대안.
// cy.login(commands.js)은 설정(loginEnvs) 기반이고, 이쪽은 인자로 직접 받는 단순 버전이다.
// 셀렉터는 대상 사이트에 맞게 아래 SELECTORS 만 바꾸면 된다.
const SELECTORS = {
    openLogin: '.login-trigger', // 로그인 폼을 여는 버튼 (폼이 바로 보이면 이 줄 + 아래 click 삭제)
    username: '#username',
    password: '#password',
    submit: '.btn-login',
};

function login(site, id, password) {
    cy.visit(site);

    // 로그인 폼이 버튼 뒤에 숨어 있는 경우에만 사용 (바로 보이면 이 블록 삭제)
    cy.get(SELECTORS.openLogin, { timeout: 10000 }).click();

    cy.get(SELECTORS.username, { timeout: 10000 }).type(id);
    cy.get(SELECTORS.password, { timeout: 10000 }).type(password, { log: false }); // 비밀번호 로그 숨김
    cy.get(SELECTORS.submit, { timeout: 10000 }).click();

    cy.log('로그인 성공');
}

module.exports = { login };
