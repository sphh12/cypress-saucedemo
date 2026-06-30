import DomBasePage from '../base/DomBasePage';

// 로그인 페이지 객체 — saucedemo / (index). 정상/음성 로그인 시나리오 공통 사용.
// 정상 happy-path 는 cy.login(env) 커맨드를 쓰지만, 음성/검증 케이스는 이 페이지 객체로 직접 제어한다.
class LoginPage extends DomBasePage {
    selectors = {
        username: '#user-name',
        password: '#password',
        loginBtn: '#login-button',
        error: '[data-test="error"]',
        errorButton: '[data-test="error-button"]',
    };

    // 로그인 화면 진입
    open() {
        this.goTo('https://www.saucedemo.com/', 'Swag Labs');
        return this;
    }

    // 자격증명 입력 후 로그인 시도 (빈 값이면 입력 없이 비워둔다 — 필수입력 검증 케이스 지원. type('') 은 Cypress 에서 에러)
    login(username, password) {
        const userField = this.body().find(this.selectors.username).clear();
        if (username) userField.type(username).should('have.value', username);
        const pwField = this.body().find(this.selectors.password).clear();
        if (password) pwField.type(password, { log: false }); // 비밀번호는 로그 비노출
        this.body().find(this.selectors.loginBtn).click();
        return this;
    }

    // 정상 로그인 → 인벤토리 진입 검증
    verifyLoginSuccess() {
        cy.url({ timeout: 20000 }).should('include', '/inventory.html');
        return this;
    }

    // 로그인 화면 복귀 검증 (로그아웃 후 등)
    verifyOnLoginPage() {
        cy.url({ timeout: 20000 }).should('match', /saucedemo\.com\/?(index\.html)?$/);
        this.waitUntil((body) => {
            expect(Cypress.$(body).find(this.selectors.loginBtn).length, '로그인 버튼 노출').to.be.greaterThan(0);
        }, 10000);
        return this;
    }

    // 음성 로그인 → 에러 메시지 검증
    verifyError(expectedText) {
        this.waitUntil((body) => {
            const error = Cypress.$(body).find(this.selectors.error);
            expect(error.length, '에러 메시지 노출').to.be.greaterThan(0);
            expect(error.text(), '에러 메시지 내용').to.include(expectedText);
        }, 10000);
        return this;
    }
}

export default new LoginPage(); // 무상태 싱글톤
