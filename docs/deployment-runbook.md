# Roundy 실행·복구 문서

이 문서는 현재 저장소에서 검증한 **로컬 통합 실행 환경**의 기동, 점검, 복구 절차를 다룹니다.

`compose.yaml`의 OpenVidu는 `openvidu/openvidu-dev` 이미지이므로 공개 서비스 운영에 사용하면 안 됩니다. AWS, 도메인, HTTPS, 운영 OpenVidu 미디어 노드는 별도 배포 설계를 확정한 뒤 이 문서를 운영용으로 확장합니다.

## 범위와 준비물

- Docker Desktop 또는 Docker Engine과 Docker Compose v2
- GitHub Actions의 `빌드 및 테스트`가 성공한 변경
- 로컬 전용 환경 파일 `.env`

`.env.example`에는 로컬 실행용 값만 들어 있습니다. 실제 카카오 로그인은 카카오 키를 `.env`에만 넣고, 해당 파일을 커밋하지 않습니다.

```bash
cp .env.example .env
```

## 기동

저장소 루트에서 실행합니다.

```bash
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

`ps`에서 아래 서비스가 모두 `healthy`가 될 때까지 기다립니다.

| 서비스                        | 확인 목적                | 로컬 주소                                         |
| ----------------------------- | ------------------------ | ------------------------------------------------- |
| frontend                      | 사용자 화면과 Nginx 상태 | `http://localhost:3000/healthz`                   |
| backend                       | Spring Boot readiness    | `http://localhost:8080/actuator/health/readiness` |
| ai                            | 얼굴 인증 서버 상태      | `http://localhost:18000/healthz`                  |
| mysql, redis, minio, openvidu | 백엔드 의존 서비스       | `docker compose --env-file .env ps`               |

API와 WebSocket은 프런트 컨테이너가 `/api/` 경로로 백엔드에 전달합니다. MySQL, Redis, MinIO 관리 포트, AI 포트, OpenVidu 개발 포트는 로컬 호스트에만 바인딩됩니다.

## 점검

```bash
docker compose --env-file .env config --quiet
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=200 backend
docker compose --env-file .env logs --tail=200 ai
```

기본 점검은 다음 순서로 합니다.

1. GitHub Actions의 프런트 빌드와 백엔드 테스트가 성공했는지 확인합니다.
2. Compose 구성 검증 후 서비스를 기동합니다.
3. 프런트, 백엔드, AI 헬스체크가 모두 200인지 확인합니다.
4. 로그인·온보딩·얼굴 인증·대기열·미팅·투표·매칭은 별도 테스트 사용자로 검증합니다.

얼굴 사진을 이용한 실제 비교 테스트는 민감정보이므로, 테스트 계정·이미지 보관·폐기 기준을 정한 뒤에만 수행합니다.

## 정상 종료와 재기동

```bash
docker compose --env-file .env down
docker compose --env-file .env up -d --build
```

`down`은 Docker 볼륨을 지우지 않으므로 MySQL, Redis, MinIO, AI 모델 캐시는 보존됩니다. 데이터가 필요할 때 `docker compose down -v` 또는 `docker volume rm`을 실행하지 않습니다.

## 장애 복구와 롤백

### 서비스 한 개가 unhealthy인 경우

1. `docker compose --env-file .env ps`로 대상 서비스를 확인합니다.
2. `docker compose --env-file .env logs --tail=200 <서비스명>`으로 원인을 확인합니다.
3. 설정을 수정했다면 `docker compose --env-file .env config --quiet`를 통과시킵니다.
4. 대상 서비스만 다시 만듭니다.

```bash
docker compose --env-file .env up -d --build <서비스명>
```

### 코드 변경을 이전 정상 커밋으로 되돌려야 하는 경우

데이터 스키마 변경 여부를 먼저 확인합니다. 현재 백엔드는 `JPA_DDL_AUTO=update`를 사용하므로, 데이터베이스 변경을 무시한 코드 롤백은 안전하지 않을 수 있습니다.

1. 현재 커밋과 Compose 상태를 기록합니다.
2. MySQL·MinIO 데이터를 별도 위치에 백업합니다.
3. 이전에 검증된 커밋 또는 태그로 작업 디렉터리를 전환합니다.
4. `docker compose --env-file .env up -d --build`로 이미지를 다시 만들고 헬스체크를 확인합니다.
5. 데이터 변경과 함께 되돌려야 한다면 애플리케이션만 되돌리지 말고, 검증된 데이터 복구 절차를 함께 수행합니다.

Git 이력을 강제로 지우는 `git reset --hard`는 복구 절차에 사용하지 않습니다.

## 공개 배포 전 필수 결정

다음은 아직 미완료이며, 실제 비용 또는 외부 변경이 발생하기 전에 사용자와 확정합니다.

- AWS 계정, 서울 리전 여부, 월 예산 상한
- 앱 서버와 OpenVidu 운영 미디어 서버의 분리 여부
- 도메인과 DNS, HTTPS 인증서 발급 방식
- 운영용 비밀값 주입 방법과 백업 보관 위치
- 운영 프로필에서 테스트 로그인·테스트 API·WebSocket 우회 차단
- 6명 테스트 사용자의 전체 미팅 흐름과 재접속 검증

이 조건이 확정되기 전에는 로컬 Compose를 인터넷에 그대로 노출하지 않습니다.
