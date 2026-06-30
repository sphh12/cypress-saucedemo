# Mac 개발 환경 구성 가이드

이 프로젝트를 Mac(Apple Silicon)에서 개발하기 위한 환경 구성 가이드입니다.

> **참고**: 테스트 대상 사이트가 사내 내부망에 있는 경우, Mac에서는 코드 작업만 가능할 수 있습니다. 이 경우 실제 테스트 실행 및 Cypress Cloud 기록은 내부망 접근이 가능한 환경(예: 회사 Windows / Docker 환경)에서 수행합니다.

---

## 1. 필수 설치 항목

### Node.js (sudo 권한 없는 경우)

```bash
# arm64 바이너리 다운로드
curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-arm64.tar.gz -o /tmp/node.tar.gz
tar xzf /tmp/node.tar.gz -C /tmp/

# ~/local에 설치
mkdir -p ~/local
cp -a /tmp/node-v22.14.0-darwin-arm64/* ~/local/

# PATH 등록
echo 'export PATH="$HOME/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 확인
node -v   # v22.14.0
npm -v    # 10.9.2
```

### Yarn

```bash
npm install -g yarn
yarn -v   # 1.22.22
```

### Cypress 의존성 설치

```bash
cd /path/to/cypress
yarn install
npx cypress install
```

### Docker Desktop

[docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) 에서 **Mac (Apple Silicon)** 버전 다운로드 후 설치

### gh CLI (GitHub 인증용)

```bash
curl -sL "https://github.com/cli/cli/releases/download/v2.88.1/gh_2.88.1_macOS_arm64.zip" -o /tmp/gh.zip
unzip -o /tmp/gh.zip -d /tmp/gh
export PATH="/tmp/gh/gh_2.88.1_macOS_arm64/bin:$PATH"

# GitHub 인증
gh auth login -h github.com -p https -w
```

---

## 2. docker-compose.yml 설정

Windows 경로가 환경변수로 처리되어 있으므로 Mac에서는 별도 설정 불필요 (기본값 `./cypress-history` 사용):

```yaml
volumes:
    - ${CYPRESS_HISTORY_DIR:-./cypress-history}:/app/cypress-history
```

Windows에서는 `.env`에 추가:
```
CYPRESS_HISTORY_DIR=./cypress-history
```

> 다른 경로에 기록을 저장하고 싶다면 `CYPRESS_HISTORY_DIR` 값에 원하는 절대/상대 경로를 지정하면 됩니다.

---

## 3. 실행 가능 작업

> 아래 표는 테스트 대상 사이트가 사내 내부망에 있는 경우를 가정한 예시입니다. 테스트 대상 사이트가 공개망(인터넷)에서 접근 가능하다면 Mac에서도 모든 작업이 가능합니다.

| 작업 | Mac | Windows (회사) |
|------|-----|----------------|
| 코드 작성/수정 | O | O |
| 커밋/푸시 | O | O |
| `yarn cypress open` (GUI) | X (내부망) | O |
| `yarn cypress run` (CLI) | X (내부망) | O |
| `docker compose up` | X (내부망) | O |
| Cypress Cloud 기록 | X | O |

---

## 4. 로컬 테스트 명령어 (내부망 접근 가능 환경)

```bash
# GUI 모드 (테스트 선택 실행)
yarn cypress open

# CLI 모드 (전체 실행)
yarn cypress run --browser chrome

# 특정 스펙 실행
yarn cypress run --spec "cypress/e2e/sample/sample.dom.cy.js"

# Docker 메인 테스트
docker compose up

# Docker 개발 테스트 (Xvfb + headed)
docker compose --profile dev up --build
```
