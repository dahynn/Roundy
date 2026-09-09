# 로컬 개발·검증 안내

이 문서는 배포 전 코드 변경을 같은 조건으로 검증하기 위한 최소 절차입니다. 실제 Kakao 로그인, 카메라·마이크, 외부 OpenVidu 서버는 실행하지 않습니다.

## 사전 조건

- JDK 21
- Node.js 22
- Docker Desktop (Redis 원자성 테스트를 실행할 때만 필요)
- 프로젝트 루트의 `.env.example`을 복사한 `.env` 또는 각 서비스의 기존 비밀 환경 파일. 비밀 값은 Git에 추가하지 않습니다.

## 프런트엔드

```bash
cd Frontend
npm ci
npm test
npm run build
```

`npm run build`에는 TypeScript 검사와 Vite 프로덕션 빌드가 포함됩니다.

## 백엔드 기본 테스트

```bash
cd Backend
./gradlew --no-daemon test
```

기본 테스트는 H2와 Mock OpenVidu를 사용합니다. Redis 원자성 테스트는 `ROUNDY_TEST_REDIS_PORT`가 있을 때만 실행됩니다.

## Redis 원자성 테스트까지 실행

사용 중인 Redis나 개발 데이터를 사용하지 말고, 전용 임시 Redis를 사용합니다.

```bash
docker run --rm -d --name roundy-test-redis -p 16379:6379 redis:7-alpine
cd Backend
ROUNDY_TEST_REDIS_PORT=16379 ./gradlew --no-daemon test --rerun-tasks
docker stop roundy-test-redis
```

CI도 Redis 7 서비스를 띄운 뒤 같은 환경 변수로 백엔드 전체 테스트를 실행합니다.

## 현재 검증 경계

- 이 절차는 API 계약, Redis 원자성, WebSocket 메시지 및 Mock OpenVidu 요청을 검증합니다.
- 실제 영상 연결, TURN/방화벽, 두 브라우저 이상의 공개 환경 E2E는 배포 환경에서 별도로 확인해야 합니다.
