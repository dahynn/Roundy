# 📱 클라이언트 구현 가이드 (Roundy Backend 연동)

이 문서는 백엔드 로직(매칭, 로테이션, 웹소켓)에 맞춰 **프론트엔드에서 처리해야 할 사항**들을 정리합니다.

---

## 1. 매칭 및 입장 (Matching & Entry)

### 1.1 매칭 대기열 등록
*   **API:** `POST /api/session/enter` (Header: JWT 필수)
*   **Body:** `{ "requestId": null }` (현재 미사용 중이므로 null 또는 빈 문자열 전송 가능)
*   **Polling 방식:**
    *   3초 간격으로 계속 호출하세요.
    *   서버에서 로직이 개선되어, **누가 매칭을 성사시켰든 상관없이** 모든 유저가 다음 폴링 시 즉시 `roomId`를 응답받게 됩니다.
*   **응답 처리:**
    *   응답: `{"success": true, "data": { "roomId": "uuid...", "gender": "MALE" }}`
    *   **Action:** `roomId`가 있으면 즉시 **Polling을 중단**하고 WebSocket 연결을 시작하세요.
    *   `roomId`가 없으면 계속 Polling을 유지하세요.

### 1.2 WebSocket 연결
매칭이 성사되어 `roomId`를 받으면 즉시 WebSocket에 연결합니다.

*   **URL:** `wss://{server}/ws/webrtc`
*   **Query Params:**
    *   `token={jwt_token}` (필수)
*   **첫 메시지 전송 (JOIN_ROOM):**
    *   연결 후 `SEND: { "type": "JOIN_ROOM" }`
    *   (roomId는 서버가 토큰에서 자동으로 인식하므로 보내지 않아도 됩니다.)
*   **이슈 방지:**
    *   반드시 매칭 성공 후 **즉시** 연결해야 합니다. (30초 이상 지연 시 타임아웃 처리될 수 있음)
    *   연결 해제 시 자동 재연결 시도를 권장합니다 (Grace Period 30초 내).

---

## 2. WebSocket 메시지 핸들링 (핵심)

서버에서 오는 `type`에 따라 상태를 전환해야 합니다.

| Message Type | 설명 | 클라이언트 액션 |
| :--- | :--- | :--- |
| **`JOIN_OK`** | 접속 성공 | OpenVidu 토큰이 포함되어 있음. **초기(공용) 세션**에 접속함. |
| **`STAGE_CHANGE`** | 단계 변경 | UI를 해당 단계(`SELF_INTRO`, `VOTE_FIRST` 등)로 전환. 타이머 표시. |
| **`PAIR_ASSIGNED`** | 파트너 배정 | (1:1 대화) **privateSessionId, privateToken**을 받음. OpenVidu **세션을 전환**해야 함. |
| **`MATCH_RESULT`** | 최종 매칭 | 매칭 결과를 화면에 표시. |
| **`FACE_REVEAL`** | 얼굴 공개 | 최종 커플만 남고 나머지는 강퇴됨. 커플은 다시 **privateSession**으로 이동. |
| **`KICK`** | 강퇴 | 매칭 실패 시 수신. "매칭 실패" 알림 후 홈 화면으로 이동. |

---

## 3. OpenVidu 세션 관리 (매우 중요 ⚠️)

로테이션 로직상 **공용 세션(6명)**과 **프라이빗 세션(2명)**을 오가야 합니다.

### 3.1 세션 전환 시점 (`PAIR_ASSIGNED`)
1.  이벤트 수신: `PAIR_ASSIGNED` (partnerId, privateToken 포함)
2.  **기존 세션 해제:** 현재 연결된 OpenVidu Session에서 `disconnect()`
3.  **새 세션 연결:** 받은 `privateToken`으로 프라이빗 세션 접속
4.  **UI 변경:** 화면에 파트너 1명만 보이도록 레이아웃 변경

### 3.2 공용 세션 복귀 (`STAGE_CHANGE`)
1.  이벤트 수신: `STAGE_CHANGE` (다음 단계가 `VOTE` 혹은 `ROTATION` 종료 시)
2.  **프라이빗 세션 해제:** 1:1 대화 종료
3.  **공용 세션 재접속:** **`JOIN_OK` 때 받았던 초기 토큰** (혹은 서버가 새로 준 토큰)을 사용하여 공용 방으로 복귀
    *   *Tip: 서버는 `STAGE_CHANGE` 시 공용 토큰을 다시 주지 않을 수 있으므로, 클라이언트가 최초 접속 시 받은 'Public Token'을 저장해둬야 할 수도 있음.* (현재 서버 로직 확인 필요: 보통 다시 JOIN_OK를 주지 않으므로, 재접속 로직 확인 필요)

---

## 4. 종료 및 재시작 처리

### 4.1 최종 종료 (End of Session)
*   `FACE_REVEAL` 단계가 끝나고 10초 후 서버에서 데이터가 정리됩니다.
*   클라이언트는 연결을 끊고 **반드시 홈 화면으로 리다이렉트** 해야 합니다.
*   **재시작 불가:** 동일한 URL이나 토큰으로 '새로고침'하여 다시 들어오면 **"좀비 방(아무도 없는 방)"**에 갇히게 됩니다.
*   **해결책:** 소개팅이 끝나면 **무조건 대기열 등록(`POST /enter`)부터 다시 시작**하도록 유도해야 합니다.

### 4.2 매칭 실패 유저 처리
*   `KICK` 메시지를 받거나, `FACE_REVEAL` 단계에서 내가 리스트에 없으면:
    *   "매칭에 실패했습니다" 팝업 표시
    *   3초 후 홈으로 이동
    *   Local State 초기화

---

## ✅ 체크리스트 (구현 시 확인)

- [ ] WebSocket 연결 끊기면 30초 내 재접속 로직이 있는가?
- [ ] 1:1 대화(`PAIR_ASSIGNED`) 시작 시 기존 OpenVidu 연결을 잘 끊는가?
- [ ] 최종 종료 후 사용자를 확실하게 로비/홈으로 내보내는가? (새로고침 방지)
- [ ] 뒤로가기 방지 (매칭 중 이탈 시 패널티 경고)
