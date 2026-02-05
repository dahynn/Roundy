# 🧪 소개팅 서비스 통합 테스트 가이드 (Redis 검증 포함)

이 가이드는 **3:3 미팅 매칭 시스템**의 전체 흐름을 테스트하고, 각 단계에서 **Redis 데이터**가 올바르게 생성/삭제되는지 검증하는 방법을 설명합니다.

---

## 📋 0. 준비 사항

### 필수 도구
1.  **Postman** (API 요청 및 WebSocket 테스트용)
2.  **Redis CLI** (데이터 검증용) - 또는 Redis Desktop Manager
3.  **Backend 서버** (실행 중이어야 함)

### 테스트 계정 및 토큰 발급
테스트를 위해 6명의 사용자(남3, 여3) 토큰이 필요합니다. 개발용 로그인 API를 사용하면 쉽게 발급받을 수 있습니다.

**API 요청 (Postman):**
*   **POST** `http://localhost:8080/api/test/ws-message/dev-login?userId={id}`

| 사용자 | ID | 성별 | 토큰 변수명 (예시) |
| :--- | :--- | :--- | :--- |
| Male 1 | 1 | MALE | `jwt_m1` |
| Male 2 | 2 | MALE | `jwt_m2` |
| Male 3 | 3 | MALE | `jwt_m3` |
| Female 1 | 4 | FEMALE | `jwt_f1` |
| Female 2 | 5 | FEMALE | `jwt_f2` |
| Female 3 | 6 | FEMALE | `jwt_f3` |

> 💡 **Tip:** 위 6개의 토큰을 메모장이나 Postman 환경변수에 저장해두세요.

---

## 🚀 1. 매칭 대기열 등록 (Phase 1)

남성 3명과 여성 2명을 먼저 대기열에 등록합니다. 아직 매칭이 성사되지 않아야 합니다.

### 1-1. 대기열 입장 요청 (5명)
각 토큰을 사용하여 5번 요청을 보냅니다.

*   **URL:** `POST http://localhost:8080/api/session/enter`
*   **Header:** `Authorization: Bearer {jwt_token}`
*   **Body:** `{"requestId": "test"}`

### 1-2. Redis 검증 (중요 ✨)
Redis CLI를 열고 다음 명령어를 입력하여 대기열 상태를 확인합니다.

```bash
# 남성 대기열 확인 (3명 있어야 함)
ZRANGE session:male 0 -1 WITHSCORES
# 결과 예시:
# 1) "1"
# 2) "1707012345678"
# 3) "2"
# 4) "1707012345679"
# ...

# 여성 대기열 확인 (2명 있어야 함)
ZRANGE session:female 0 -1 WITHSCORES
```

---

## 🚀 2. 매칭 성사 및 방 생성 (Phase 2)

마지막 여성 1명(User 6)이 입장하면 즉시 매칭이 성사되어야 합니다.

### 2-1. 매칭 트리거 요청
*   **User 6 (Female 3)**로 `/api/session/enter` 요청 전송.
*   **예상 응답:** `success: true`, `message`에 "매칭 성공" 포함, **`roomId` 반환됨.**

### 2-2. Redis 검증 (핵심)
매칭 로직(`lua script`)이 정상 작동했다면 대기열은 비워지고, 방 정보가 생성되어야 합니다.

```bash
# 1. 대기열이 비었는지 확인
ZCARD session:male   # -> 0
ZCARD session:female # -> 0

# 2. 생성된 방 ID 확인 (모든 Key 확인)
KEYS room:*:members

# 3. 방 멤버 구성 확인 (위에서 찾은 roomId 사용)
# 예: roomId가 "abc-123"이라면:
SMEMBERS room:abc-123:members
# -> 6명의 userId ("1", "2", "3", "4", "5", "6")가 모두 나와야 함

# 4. 개별 멤버의 메타데이터 확인
HGETALL room:abc-123:member:1
# -> gender: "MALE" 등의 정보 확인
```

---

## 🚀 3. WebSocket 연결 및 로테이션 (Phase 3)

매칭된 `roomId`를 가지고 WebSocket에 연결합니다.

### 3-1. WebSocket 연결 시도
Postman에서 **WebSocket Request**를 새로 생성합니다.

*   **URL:** `ws://localhost:8080/ws/webrtc`
*   **Params:** `token={jwt_m1}` (각 유저별로 연결 필요)
*   **Events:** 연결 즉시 `JOIN_OK` 메시지가 오는지 확인.

### 3-2. 로테이션 자동 시작 확인
6명이 모두 WebSocket에 연결되거나, 일정 시간이 지나면 서버 로그에서 다음을 확인합니다.

*   **Log:** `Start Rotation` 또는 `STAGE_CHANGE`
*   **Message:** 모든 클라이언트에게 `{"type": "STAGE_CHANGE", "stage": "SELF_INTRO"}` 메시지가 전송됨.

### 3-3. Redis 세션 상태 확인
DB에 저장된 세션 상태도 변경되었는지 확인할 수 있습니다.

```sql
-- (MySQL) Session Table 확인
SELECT * FROM session WHERE room_id = 'abc-123';
-- status가 'ONGOING'으로 변경되었는지 확인
```

---

## 🧹 4. 테스트 종료 및 정리

다음 테스트를 위해 Redis 데이터를 초기화합니다.

```bash
# Redis 모든 데이터 삭제 (주의!)
FLUSHALL
```

## ❓ 자주 발생하는 이슈

1.  **매칭이 안 돼요:**
    *   `session:male`과 `session:female`에 각각 3명 이상 있는지 `ZCARD`로 확인하세요.
    *   서버 로그에 Lua Script 오류가 없는지 확인하세요.

2.  **WebSocket 연결 즉시 끊김:**
    *   Redis에 해당 유저가 할당된 방 정보(`user:{id}:currentRoom` 등)가 있는지 확인하세요. (현재 로직상 `room:{id}:members`에 포함되어 있어야 함)
    *   토큰이 만료되지 않았는지 확인하세요.
