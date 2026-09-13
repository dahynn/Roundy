# Roundy 누적 매칭 합성 부하 검증 — 2026-09-12

## 목적

기존 100회 실험은 특정 경쟁 순서의 정합성 재현이다. 이 실험은 그 결과를 대용량 성능으로 포장하지 않고, 현재 매칭 Controller·SessionService·Redis Lua가 **누적 1,200개 합성 요청**에서 완전한 3:3 방 상태를 만드는지를 별도로 확인한다.

## 실행 조건

| 항목 | 값 |
| --- | --- |
| 기준 코드 | `fix/realtime-user-protection`의 `77c674f` (병합 기준 `origin/master`는 `bc75e4c`) |
| 사용자 | 개인정보 없는 고정 합성 ID 1,200명: 남성 600명, 여성 600명 |
| 동시성 | 고정 워커 64개. 최초 64개가 latch로 함께 시작하고, 나머지는 같은 executor 큐에서 누적 처리 |
| 실제 구성요소 | SessionController, SessionService, Redis Lua, loopback 전용 Redis |
| 대체 구성요소 | JWT 암호 검증·DB 조회는 Mockito 합성 사용자로 대체 |
| 제외 | HTTP 네트워크, 보안 필터, 실제 DB, AI, 브라우저, WebSocket, OpenVidu/TURN, 영상/음성 |
| 명령 | `ROUNDY_LOAD_USERS=1200 ROUNDY_LOAD_WORKERS=64 bash scripts/verification/run-cumulative-queue-load.sh <repo> <result.json>` |

## 결과

| 항목 | 관측값 |
| --- | ---: |
| 누적 요청 | 1,200 |
| 초기 응답: MATCHED | 200 |
| 초기 응답: WAITING | 1,000 |
| 업무 거절 / 호출 예외 | 0 / 0 |
| 최종 완전 방 | 200개 (각 6명, 남성 3명) |
| 불완전·고아 방 | 0 |
| 중복 방 멤버 | 0 |
| 최종 미배정 사용자 / 큐 잔류 | 0 / 0 |
| Controller 호출 시간 p50 / p95 / p99 / max | 12.435 / 23.372 / 32.670 / 34.642 ms |

`WAITING` 1,000건은 실패가 아니다. 제한된 워커에서 먼저 처리된 요청은 그 시점에 3:3 조건이 아직 채워지지 않아 대기 응답을 받고, 이후 다른 요청으로 생성된 방에 최종 배정됐다. 이 시험은 모든 합성 사용자의 최종 `currentRoom`, 멤버 Set/Hash, 큐 잔류를 함께 검사한다.

## 원본·재현성

- 결과 원본: [result.json](result.json)
- 결과 SHA-256: `42c17d36efb1c8f1ef5415c4641bd65148968a0e5b902b6088e95ac18b3e8b28`
- 시험기: `scripts/verification/java/com/ssafya701/roundy/measurement/CumulativeQueueLoadExperiment.java`
- 실행 스크립트: `scripts/verification/run-cumulative-queue-load.sh`
- Gradle 테스트 XML은 실행 직후 `Backend/build/test-results/cumulativeLoadTest/`에 생성됐으며, 1 test, failures 0, errors 0, skipped 0이었다.

## 해석 경계

이것은 64개 워커로 처리한 로컬 합성 Controller/Redis 시험이다. 1,200명의 실제 동시 접속, HTTP 처리량, 영상 통화 동접, 실제 DB·AI·네트워크 지연, 공개 서비스의 성능·가용성을 뜻하지 않는다. 호출 p95는 모의 JWT/DB가 포함된 로컬 경과 시간이라 운영 성능 개선율로 사용하지 않는다.
