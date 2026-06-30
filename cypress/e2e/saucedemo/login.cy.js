import LoginPage from '../../pages/dom/LoginPage';

describe('[saucedemo] 로그인', () => {
    it('standard_user 로 정상 로그인하면 인벤토리로 진입한다', () => {
        // 정상 계정으로 로그인 후 인벤토리 진입 검증
        LoginPage.open().login('standard_user', 'secret_sauce').verifyLoginSuccess();
    });

    it('잠긴 계정으로 로그인하면 차단 에러가 표시된다', () => {
        // 잠긴 계정 데이터 로드
        const locked = Cypress.env('lockedUser');
        // 잠긴 계정 로그인 시 차단 에러 검증
        LoginPage.open().login(locked.username, locked.password).verifyError('Sorry, this user has been locked out');
    });

    it('아이디를 비우고 로그인하면 아이디 필수 에러가 표시된다', () => {
        // 아이디 미입력 시 필수 에러 검증
        LoginPage.open().login('', 'secret_sauce').verifyError('Username is required');
    });

    it('비밀번호를 비우고 로그인하면 비밀번호 필수 에러가 표시된다', () => {
        // 비밀번호 미입력 시 필수 에러 검증
        LoginPage.open().login('standard_user', '').verifyError('Password is required');
    });

    it('잘못된 비밀번호로 로그인하면 불일치 에러가 표시된다', () => {
        // 자격증명 불일치 에러 검증
        LoginPage.open().login('standard_user', 'wrong_password').verifyError('Username and password do not match');
    });
});
