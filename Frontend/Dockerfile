# 1단계: 빌드 환경 (Node.js 20)
FROM node:20-alpine AS builder
WORKDIR /app

# 패키지 설정 파일 복사 및 라이브러리 설치
COPY package*.json ./
RUN npm install

# 소스 전체 복사 및 정적 파일 빌드 (dist 폴더 생성)
COPY . .
RUN npm run build

# 2단계: 실행 환경 (Nginx를 사용하여 정적 파일 서빙)
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# 기존 기본 파일 삭제 후 빌드 결과물만 복사
RUN rm -rf ./*
COPY --from=builder /app/dist .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]