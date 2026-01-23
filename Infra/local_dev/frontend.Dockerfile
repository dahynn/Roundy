# frontend/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY Frontend/package*.json ./
RUN npm install
COPY . .
# Vite의 경우 외부 접속 허용을 위해 --host 옵션 필요
CMD ["npm", "run", "dev", "--", "--host"]