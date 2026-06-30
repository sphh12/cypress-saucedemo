// 모듈 barrel — 공통 헬퍼 모듈을 한곳에서 모아 re-export 한다.
//   사용 예: const { loginModule } = require('./index');
const loginModule = require('./login.module.js');

module.exports = {
    loginModule,
    // 필요한 모듈을 여기에 추가
};
