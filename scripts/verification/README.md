# 매칭 경쟁 반복 실험

실제 과거 Controller/Service/Lua를 각 Git 작업 트리에서 그대로 컴파일합니다.
검증 전용 source set만 Gradle init script로 추가합니다. 운영 소스의 재작성이나
실패를 만들기 위한 약화는 없습니다.

## 실행

필수: JDK 21, Redis server/cli, Bash, Python 3, Gradle 의존성 캐시 또는 다운로드 권한.
전용 Redis를 loopback에서 실행하고 종료합니다. 기존 서버·컨테이너는 사용하지 않습니다.
임시 작업 트리를 만들 때는 먼저 동일 경로가 없는지 확인합니다.

```sh
git worktree add --detach /private/tmp/roundy-before-6e60b8d 6e60b8d
git worktree add --detach /private/tmp/roundy-after-988e2f6 988e2f6
export JAVA_HOME=/path/to/jdk21
export GRADLE_USER_HOME=/path/to/gradle-cache
python3 /path/to/measurement-tools/measurement_lock.py --timeout 60 -- \
  bash scripts/verification/run-queue-concurrency.sh \
  /private/tmp/roundy-before-6e60b8d \
  /private/tmp/roundy-after-988e2f6 \
  /absolute/path/to/current/Roundy \
  /absolute/path/to/new-result-directory
python3 scripts/verification/summarize-queue-concurrency.py /absolute/path/to/new-result-directory
```

기본은 버전별·시나리오별 워밍업 3회와 측정 100회입니다.
ROUNDY_CONCURRENCY_REPEATS=1로 smoke를 먼저 할 수 있습니다.
출력 디렉터리가 이미 존재하면 덮어쓰지 않습니다. 16379 포트가 사용 중이면 중단하며
ROUNDY_TEST_REDIS_PORT로 비어 있는 다른 포트를 지정할 수 있습니다.
공통 잠금을 우회하지 않습니다. Redis를 daemon으로 분리하지 않습니다.

## 동등 조건과 인증 어댑터

- JWT 암호 검증/사용자 DB 조회만 동일한 합성 사용자로 모의 처리합니다.
- VerificationService의 실제 PENDING → VERIFIED 코드를 두 버전 모두 호출합니다.
  얼굴 영상·AI 추론은 실행하지 않습니다.
- 이전 Controller의 4개 생성자 의존성과 수정 후 3개 의존성은 반사 호출로 연결합니다.
  이전 Controller가 수행하던 검증 소비/대기열/기존 방 조회를 생략하지 않습니다.
- 지연 장벽은 실제 Controller가 SessionService.addToQueueAndMatch를 호출하는 경계에만
  둡니다. 과거에는 사전 조회 뒤, 수정 후에는 원자적 Lua 실행 전입니다.
  5명 대기 → 사용자0 폴링을 해당 경계에서 정지 → 6번째 입장/매칭 완료 →
  사용자0 폴링 재개 순서를 두 버전에 동일하게 적용합니다.
- 실시간에 맡기는 장벽 실험의 OS 실행 순서는 고정 seed로 재현된다고 주장하지 않습니다.
  고정 합성 ID와 호출 번호·결과·시간을 모두 원본 JSONL에 남깁니다.

## 시나리오

1. delayed-poll-after-match: 위 제어 스케줄에서 이미 매칭된 사용자의 재큐잉 여부.
2. six-entry-and-poll: 6명 동시 시작, 완료 후 16개 폴링 동시 시작. 3+3 정원,
   한 사용자 한 방, 매칭된 사용자의 대기열 잔류를 검사합니다.
3. duplicate-first-entry: 한 사용자의 최초 입장 16개 동시 시작. 한 자리/인증 1회 소비,
   정상 재시도의 업무 거절 건수를 기록합니다.
4. stale-room-cleanup: 이전 방 멤버/새 방 소유권 상태에서 이전 방 정리. 새 매핑 소실 여부.
   이 시나리오는 명시적 상태 fixture이며 자연 발생 빈도를 뜻하지 않습니다.

일반 SessionQueueRedisTest에는 취소 선행 순서, 취소/최종 입장 25회 동시 시작,
오래된 방 정리와 중복 정리 회귀 테스트도 있습니다.

## 해석 경계

- 강제 경쟁의 N/100은 해당 스케줄의 재현율이지 운영 장애율이 아닙니다.
- 지연은 실제 Controller 호출 구간에 모의 JWT/DB·Mockito 계측·Redis가 포함된 로컬 값입니다.
  HTTP 네트워크, 필터, 브라우저, 실제 DB, 얼굴 AI, WebSocket, OpenVidu/TURN은 포함하지 않습니다.
- 의도적 지연 시나리오는 p95 성능 비교에서 제외합니다. 다른 시나리오의 모든 요청과
  성공 요청 p95, 업무 거절 분모를 별도 표시합니다. 실패/거절을 빨리 반환한 버전이
  더 빠르다고 개선율을 만들지 않습니다. 여러 JVM/OS 부하에 따른 편차가 있습니다.
- 취소가 매칭보다 늦은 경우 서버 큐 삭제 결과는 false이며 방은 유지됩니다.
  현재 HTTP leave는 이를 성공으로 포장합니다. 미입장자 회수/취소 UX 정책은 미해결이며
  큐 원자성 시험 통과를 사용자 취소 흐름 전체 완료로 해석하지 않습니다.
- Redis standalone 전제입니다. Redis Cluster, 다중 앱 인스턴스, 6인 영상 E2E 및 공개 배포
  완료를 증명하지 않습니다. 개인정보 없는 합성 데이터이며 AI 작성 변경과 개인 기여는 별개입니다.
