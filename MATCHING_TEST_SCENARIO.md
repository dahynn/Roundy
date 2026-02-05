# 🧪 Redis 매칭 시스템 및 WebSocket 연결 테스트 시나리오

**목표:** 남성 3명, 여성 3명이 대기열에 등록했을 때, 정확히 3:3 매칭이 이루어지고 `roomId` 파라미터 없이 WebSocket 연결이 성공하는지 검증합니다.

---

## 📋 1. 준비 사항 (전제 조건)

1.  **서버 실행:** Spring Boot 백엔드 서버가 실행 중이어야 합니다 (`http://localhost:8080`).
2.  **Redis 실행:** 로컬 Redis 서버가 실행 중이어야 합니다 (`localhost:6379`).
3.  **사용자 토큰(JWT):** 서로 다른 사용자 ID(`userId`)를 가진 6개의 JWT 토큰이 필요합니다.
    *   `Token_Male_1` (userId: 1)
    *   `Token_Male_2` (userId: 2)
    *   `Token_Male_3` (userId: 3)
    *   `Token_Female_1` (userId: 4)
    *   `Token_Female_2` (userId: 5)
    *   `Token_Female_3` (userId: 6)

> 💡 **Tip:** DB에 테스트 유저 6명을 미리 생성해두세요.

---

## 🚀 2. 테스트 단계 (Step-by-Step)

### Step 1: 대기열 등록 (남성 1~3, 여성 1~2)

5명의 사용자를 순차적으로 대기열에 입장시킵니다. 아직 매칭이 되면 안 됩니다.

**API 요청:**
*   **Method:** `POST`
*   **URL:** `http://localhost:8080/api/session/enter`
*   **Header:** `Authorization: Bearer {Token}`
*   **Body:**
    ```json
    {
        "requestId": "req_user_1"  // 각 유저별로 고유한 값 사용 권장
    }
    ```

**예상 결과:**
*   응답: `success: true`, `message`: "세션에 입장했습니다. 잠시 후 매칭됩니다."
*   **Redis 확인 (`redis-cli`):**
    ```bash
    # 남성 큐 확인
    ZRANGE session:male 0 -1
    # 여성 큐 확인
    ZRANGE session:female 0 -1
    ```
    (각각 입력한 인원수만큼 ID가 있어야 함)

---

### Step 2: 매칭 트리거 (마지막 여성 입장)

마지막 6번째 사용자(여성 3)를 입장시켜 매칭을 성사시킵니다.

**API 요청 (여성 3):**
*   **Method:** `POST`
*   **URL:** `http://localhost:8080/api/session/enter`
*   **Header:** `Authorization: Bearer {Token_Female_3}`
*   **Body:** `{"requestId": "req_f3"}`

**예상 결과:**
*   응답: `success: true`, `message`: "매칭 성공", **`roomId`: "uuid-..."**

---

### Step 3: Redis 데이터 검증 (중요 ✨)

매칭 직후 Redis에 데이터가 정확히 생성되었는지 확인합니다.

**1. 대기열 비워짐 확인**
```bash
ZCARD session:male
# -> 0 (0명이어야 함)
ZCARD session:female
# -> 0 (0명이어야 함)
```

**2. 방 멤버 매핑 확인**
```bash
KEYS room:*:member:*
# -> 6개의 키가 보여야 함
```

**3. ★ User-Room 매핑 확인 (WebSocket 연결용)**
```bash
GET user:{userId}:currentRoom
# 예: GET user:1:currentRoom
# -> 방금 생성된 roomId 값이 나와야 함 (우리가 추가한 기능!)
```

---

### Step 4: WebSocket 연결 (Server-side Lookup)

이제 `roomId` 파라미터 **없이** WebSocket 연결을 시도합니다.

**WebSocket 요청:**
*   **URL:** `ws://localhost:8080/ws/webrtc?token={Token_Male_1}`
    *   *(주의: `&roomId=...` 파라미터 없음)*

**1. 정상 케이스 (성공)**
*   연결이 즉시 끊기지 않고 유지됨.
*   서버 로그:
    ```
    ✅ Redis 권한 확인 성공: userId=1, roomId=abc-123...
    WebSocket 핸드셰이크 성공: userId=1, roomId=abc-123...
    ```
*   클라이언트 수신 메시지 (`JOIN_OK`):
    ```json
    {
        "type": "JOIN_OK",
        "roomId": "abc-123...",
        ...
    }
    ```

**2. 실패 케이스 (매칭 안 된 유저)**
*   매칭되지 않은 제3의 유저 토큰으로 연결 시도.
*   **결과:** 연결 즉시 종료 (Close Code: 1000 or Error).
*   서버 로그: `❌ WebSocket 연결 실패: 배정된 방 없음`

---

### Step 5: 전체 로직 흐름 검증 (Flow Verification)

WebSocket 연결 성공 후, 실제 게임 로테이션이 정상적으로 진행되는지 확인합니다.

**1. 방 입장 (JOIN_ROOM)**
*   연결된 WebSocket 세션으로 입장 메시지를 보냅니다.
    ```json
    {
        "type": "JOIN_ROOM",
        "roomId": "abc-123..." // (매칭 시 받은 roomId)
    }
    ```
*   **예상 결과:** `JOIN_OK` 메시지 수신.

**2. 6명 전원 입장 완료 및 자동 시작**
*   6명(남3+여3)이 모두 위 과정을 거쳐 입장하면, 마지막 사람 입장 직후 **자동으로 로테이션이 시작**됩니다.
*   **예상 결과:** 서버로부터 `STAGE_CHANGE` (value: "SELF_INTRO") 메시지가 브로드캐스트 됩니다.
    ```json
    { "type": "STAGE_CHANGE", "stage": "SELF_INTRO", "timestamp": ... }
    ```

**3. 스테이지 자동 전환 확인**
*   각 스테이지(자기소개 등) 시간이 지나면 자동으로 다음 단계로 넘어가는지 메시지를 관찰합니다.
*   **자기소개(SELF_INTRO):** 5초 간격으로 `SPEAKER_CHANGE` 메시지가 오는지 확인.
*   **투표(VOTE_FIRST):** `STAGE_CHANGE` -> `VOTE_FIRST` 메시지 수신 확인.

**4. 이미지 게임 건너뛰기 확인 (중요)**
*   `ROTATION_SHORT` 단계가 끝난 후, `IMAGE_GAME`이 아닌 **`ROTATION_LONG`**으로 바로 넘어가는지 확인합니다.
*   **Flow:** `ROTATION_SHORT` (종료) -> `ROTATION_LONG` (시작)

**5. 최종 투표 및 매칭 결과**
*   `VOTE_FINAL` 단계가 되면 클라이언트(Postman)에서 투표 메시지를 전송합니다.
    ```json
    {
        "type": "SUBMIT_VOTE",
        "targetUserId": 4, // 상대방 ID
        "isFinalVote": true
    }
    ```
*   모든 인원이 투표를 마치거나 시간이 종료되면 `MATCHING_RESULT` 메시지가 오는지 확인합니다.

---

## 🧹 3. 테스트 후 정리

테스트가 끝나면 다음 매칭 테스트를 위해 Redis 데이터를 정리하는 것이 좋습니다.

```bash
# 모든 데이터 삭제 (주의!)
FLUSHALL

# 또는 관련 키만 삭제
# DEL session:male session:female room:* user:*:currentRoom
```
