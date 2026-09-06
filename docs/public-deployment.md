# Roundy 공개 배포 준비 문서

이 문서는 **첫 공개 MVP용 단일 앱 서버 구성**을 설명합니다. 로컬 `compose.yaml`과 별도로 `compose.production.yaml`을 사용합니다. 실제 서버 생성, 도메인 구매·DNS 변경, 카카오 설정 변경은 사용자의 승인 뒤에만 수행합니다.

## 구성

```text
브라우저 ─ HTTPS ─ Caddy ─ frontend(Nginx) ─ backend ─ MySQL / Redis / MinIO / AI
                                              └────────── 별도 OpenVidu 운영 미디어 노드
```

- Caddy만 서버의 80·443 포트를 공개합니다. 나머지 컨테이너 포트는 Docker 네트워크 내부에만 존재합니다.
- 프런트의 `/api/`와 WebSocket은 기존 Nginx를 거쳐 백엔드로 전달됩니다.
- MinIO 객체 주소는 `/minio-api/` 경로로만 프록시되며, MinIO 관리 콘솔은 공개하지 않습니다.
- `openvidu/openvidu-dev`는 공개 구성에 포함하지 않습니다. 별도 운영 OpenVidu 미디어 노드와 HTTPS 주소가 필수입니다.

## 서버 준비 전 확인

1. `ROUNDY_DOMAIN`의 A 레코드가 앱 서버 공인 IP를 가리키고, TCP 80·443과 UDP 443이 열려 있어야 합니다.
2. `media.<도메인>` 등 OpenVidu 공개 주소가 별도 운영 미디어 노드에 연결되어 있어야 합니다.
3. 카카오 개발자 콘솔의 Redirect URI를 `https://<도메인>/api/auth/kakao/callback`으로 등록해야 합니다.
4. `.env.production`에 실제 비밀값을 넣고 Git에 추가하지 않습니다.

## 환경 파일과 구성 검증

```bash
cp .env.production.example .env.production
# .env.production의 placeholder를 실제 값으로 모두 교체
docker compose --env-file .env.production -f compose.production.yaml config --quiet
./scripts/check-production-ready.sh --env-file .env.production
```

첫 기동에서는 기존 JPA 방식 때문에 `JPA_DDL_AUTO=update`가 필요할 수 있습니다. 스키마와 백업을 확인한 뒤에는 `validate`로 바꾸고 재기동합니다.

사전 점검 스크립트는 컨테이너를 실행하지 않으며, 비밀값을 출력하지 않습니다. placeholder, 도메인 형식, HTTPS OpenVidu 주소와 Compose 문법만 확인합니다.

## 기동과 점검

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d --build
docker compose --env-file .env.production -f compose.production.yaml ps
curl -fsS https://<도메인>/healthz
curl -fsS https://<도메인>/actuator/health/readiness
```

`https://<도메인>/healthz`와 readiness가 응답한 뒤 카카오 로그인, 온보딩, 얼굴 인증, 3대3 미팅을 별도 테스트 사용자로 검증합니다. 얼굴 이미지와 실제 사용자 계정은 측정 목적·보관 기간·폐기 방법을 합의한 경우에만 사용합니다.

## 중단과 복구

```bash
docker compose --env-file .env.production -f compose.production.yaml logs --tail=200 backend
docker compose --env-file .env.production -f compose.production.yaml up -d --build backend
```

`down -v`는 MySQL·Redis·MinIO·Caddy 볼륨을 삭제하므로 운영 복구 명령으로 사용하지 않습니다. 롤백 전에는 MySQL과 MinIO 데이터를 별도로 백업해야 합니다.
