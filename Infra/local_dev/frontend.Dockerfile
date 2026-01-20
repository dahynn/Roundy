# 1. Node.js 공식 LTS 이미지 사용 (Ubuntu보다 가볍고 이미 설정이 다 되어 있습니다)
FROM node:20-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 개발 서버 포트 노출 (Vite 기본 포트)
EXPOSE 5173

# 4. 실행 명령어 (docker-compose에서 덮어쓰지 않을 경우의 기본값)
# 호스트(0.0.0.0) 설정을 해줘야 컨테이너 밖(윈도우)에서 접속이 가능합니다.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]