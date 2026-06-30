const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
    chromeWebSecurity: false,
    // projectId: 'YOUR_CYPRESS_CLOUD_PROJECT_ID', // Cypress Cloud 사용 시 주석 해제

    viewportWidth: 1920,
    viewportHeight: 1080,
    pageLoadTimeout: 60000,

    experimentalStudio: true,
    video: true,

    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
        charts: true,
        reportPageTitle: 'Cypress Report',
        embeddedScreenshots: true,
        inlineAssets: true,
        saveAllAttempts: false,
    },
    e2e: {
        defaultCommandTimeout: 5000,
        pageLoadTimeout: 120000, // 120초 (필요에 따라 조정)
        specPattern: 'cypress/e2e/**/*.cy.js',
        setupNodeEvents(on, config) {
            // Docker/Linux 환경에서 Chrome 안정성 플래그 추가
            on('before:browser:launch', (browser, launchOptions) => {
                if (browser.name === 'chrome') {
                    launchOptions.args.push('--no-sandbox');
                    launchOptions.args.push('--disable-dev-shm-usage');
                    launchOptions.args.push('--disable-gpu');
                    console.log('Chrome 플래그 추가: --no-sandbox, --disable-dev-shm-usage, --disable-gpu');
                }
                return launchOptions;
            });

            // 다운로드 파일 처리용 task
            on('task', {
                // 다운로드 폴더에서 가장 최근 파일명 반환
                getLatestDownloadedFile(downloadPath) {
                    const files = fs.readdirSync(downloadPath);
                    const latestFile = files.reduce((prev, curr) => {
                        const prevMtime = fs.statSync(path.join(downloadPath, prev)).mtime.getTime();
                        const currMtime = fs.statSync(path.join(downloadPath, curr)).mtime.getTime();
                        return currMtime > prevMtime ? curr : prev;
                    }, '');
                    return latestFile;
                },
                // 다운로드 폴더 파일 개수
                getFileCount(downloadPath) {
                    return fs.readdirSync(downloadPath).length;
                },
                // 다운로드 폴더 비우기
                deleteFiles(downloadPath) {
                    const files = fs.readdirSync(downloadPath);
                    files.forEach((file) => {
                        fs.unlinkSync(path.join(downloadPath, file));
                    });
                    return null;
                },
            });

            // mochawesome 리포터 플러그인 등록
            require('cypress-mochawesome-reporter/plugin')(on);

            // 성공한 테스트의 비디오 자동 삭제 (실패 시에만 비디오 유지)
            on('after:spec', (spec, results) => {
                if (results && results.video) {
                    const hasFailures = results.tests && results.tests.some(
                        (test) => test.attempts && test.attempts.some((attempt) => attempt.state === 'failed')
                    );
                    if (!hasFailures) {
                        // 실패가 없으면 비디오 파일 삭제 (원본 + 압축본 모두)
                        try {
                            const videoDir = path.dirname(results.video);
                            const specName = path.basename(spec.relative).replace(/\.cy\.(js|ts)$/, '');
                            const files = fs.readdirSync(videoDir);
                            files.forEach((file) => {
                                if (file.startsWith(specName) && file.endsWith('.mp4')) {
                                    fs.unlinkSync(path.join(videoDir, file));
                                }
                            });
                            console.log(`비디오 삭제 (테스트 성공): ${spec.relative}`);
                        } catch (e) {
                            console.error(`비디오 삭제 실패: ${e.message}`);
                        }
                    } else {
                        console.log(`비디오 유지 (테스트 실패): ${spec.relative}`);
                    }
                }
            });

            return config;
        },
        env: {
            // 로그인 환경/테스트 데이터는 cypress.env.json 에서 주입한다 (cypress.env.example.json 참고).
            // 실제 URL·계정·민감정보를 이 파일에 직접 넣지 말 것 — 이 파일은 git에 커밋된다.
            loginEnv: 'local',
            EmailBody: `Cypress 자동화 테스트 스위트가 완료되었습니다`,
        },
    },
});
