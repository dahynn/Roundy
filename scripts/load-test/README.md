# AWS 매칭 HTTP 부하 검증

이 도구는 OpenVidu·TURN·영상·음성·브라우저를 제외한다. 전용 AWS 앱 노드에서 Spring Boot, MySQL, Redis를 기동하고, 별도 AWS 발생기 노드에서 설정한 수만큼 `POST /api/session/enter` 요청을 동시에 시작한다. 기본값은 3,000명이며 `LOAD_TEST_USERS`로 변경한다.

## 성공 기준

- HTTP·애플리케이션 수락률 100%
- 짝수 사용자 수를 남녀 동수로 생성해 완전한 3:3 방과 대기열 0명을 검증
- 중복 배정, 미확인 성별, 불완전 방 0
- k6의 처리량과 p95·p99는 결과 JSON에서 기록하되 운영 SLA로 일반화하지 않음
- 합성 사용자 목록은 실행마다 섞고, `metadata.json`에 목록 SHA-256 다이제스트를 기록

## 보안 경계

- 이 전용 테스트 환경은 실제 사용자·카카오·얼굴 이미지·OpenVidu를 사용하지 않는다.
- JWT와 생성된 `actors.json`은 인증 정보다. `scripts/load-test/generated/`는 Git에 추가하지 않고, 앱 노드와 발생기 노드에서 시험 직후 삭제한다.
- 앱 노드 보안 그룹의 8080은 부하 발생기 보안 그룹에만 허용한다.

## 순서

앱 노드에서 전용 `.env.matching-loadtest`를 만들고 다음을 실행한다.

```bash
docker compose --env-file .env.matching-loadtest -f compose.matching-loadtest.yaml up -d --build
./scripts/load-test/prepare-matching-fixture.sh
```

`actors.json`만 발생기 노드로 암호화된 전송 수단을 통해 복사한다. 발생기 노드에서는 저장소를 clone한 뒤 다음을 실행한다.

```bash
export TARGET_URL=http://<APP_PRIVATE_IP>:8080
./scripts/load-test/run-matching-burst.sh
```

앱 노드에서 최종 정합성을 확인한다.

```bash
./scripts/load-test/verify-matching-fixture.sh
```

결과를 수집한 뒤, 앱 노드에서만 아래 명령을 명시적으로 실행한다.

```bash
./scripts/load-test/destroy-matching-loadtest.sh --destroy
```
