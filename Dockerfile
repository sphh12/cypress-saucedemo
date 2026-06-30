FROM cypress/browsers:node-24.11.1-chrome-142.0.7444.175-1-ff-145.0.1-edge-142.0.3595.90-1

# 필요한 패키지: curl(메일 발송 옵션), xvfb(헤디드/네이티브 팝업 디버깅)
RUN apt-get update && apt-get install -y \
    curl \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 설치 (package.json 기준; lock 파일은 최초 설치 시 생성됨)
COPY package.json ./
RUN npm install

# 프로젝트 파일 복사
COPY . .

# 기본 명령어
CMD ["sh", "./shell/run-test.sh"]
