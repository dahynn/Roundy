# Backend Service Logic Documentation

**마지막 업데이트:** 2026-02-04
**설명:** 현재 구축된 Backend 서비스의 핵심 로직(매칭, 로테이션, 화상 채팅 등)을 정리한 문서입니다.

---

## 🏗️ 1. 아키텍처 개요

Backend 서비스는 **Spring Boot** 기반으로 구축되어 있으며, 실시간 통신을 위해 **WebSocket**을 사용하고 화상 통신에는 **OpenVidu** 미디어 서버를 활용합니다. 매칭 대기열 및 세션 관리는 **Redis**를 사용하여 고성능/원자성을 보장합니다.

### 📦 주요 모듈
| 모듈명 | 설명 | 주요 기술 |
| :--- | :--- | :--- |
| **Match System** | 3:3 미팅 매칭 대기열 관리 및 성사 | Redis (Sorted Set, Lua Script) |
| **Room System** | 매칭된 그룹의 방(Room) 관리 및 상태 동기화 | In-Memory (`RoomRegistry`), WebSocket |
| **Rotation Engine** | 8단계 미팅 진행 (자기소개, 1:1 대화, 투표 등) 자동화 | ScheduledExecutorService |
| **Signaling** | 클라이언트-서버 간 실시간 이벤트 전송 | WebSocket (`TextWebSocketHandler`) |
| **Media Server** | 화상/음성 데이터 중계 | OpenVidu Client |

---

## ⚡ 2. 매칭 시스템 (Matching System)

사용자가 "매칭 시작"을 누르면 대기열에 진입하고, 남녀 3:3이 모이면 즉시 방이 생성됩니다.

### 2.1 대기열 관리 (`SessionService`)
*   **저장소:** Redis Sorted Set (`session:male`, `session:female`)
*   **Score:** 입장 시간 (Timestamp) → 선착순 매칭 보장
*   **로직:**
    1.  사용자가 `addToQueueAndMatch` 요청.
    2.  `ZADD`로 대기열 등록.
    3.  `tryMatchRoom` 실행으로 매칭 시도.

### 2.2 원자적 매칭 (Lua Script)
*   **Atomic Operation:** `match-room.lua` 스크립트를 통해 동시성 문제 없이 매칭 수행.
*   **조건:** 남성 대기자 ≥ 3명 AND 여성 대기자 ≥ 3명.
*   **실행:**
    1.  조건 충족 시 각 큐에서 상위 3명씩 `ZPOPMIN`으로 꺼냄.
    2.  `roomId` (UUID) 할당.
    3.  참가자 목록과 `roomId`를 반환 (`MATCHED` 상태).
*   **결과:** 매칭된 사용자들은 할당된 `roomId`를 받아 WebSocket 연결을 시도하게 됨.

---

## 🚪 3. 방 및 WebSocket 시스템 (Room & WebSocket)

매칭된 사용자들은 WebSocket을 통해 실시간으로 상태를 공유하며 미팅을 진행합니다.

### 3.1 연결 및 입장 (`WebRtcWebSocketHandler`)
1.  **Handshake:** JWT 토큰 검증 및 `roomId` 확인.
2.  **Connection:** `WebRtcWebSocketHandler.afterConnectionEstablished` 호출.
3.  **Join Room:**
    *   `RoomRegistry`에서 방 조회 (없으면 생성).
    *   `OpenViduService.ensureSession`으로 미디어 세션 생성.
    *   `openViduService.generateToken`으로 화상 연결 토큰 발급.
    *   `JOIN_OK` 메시지로 클라이언트에 토큰 및 방 정보 전송.

### 3.2 방 상태 관리 (`RoomRegistry`, `RoomState`)
*   **RoomRegistry:** 메모리 상에서 활성화된 모든 `RoomState` 객체를 관리 (ConcurrentHashMap).
*   **RoomState:**
    *   참가자 목록 (`ParticipantState`) 관리.
    *   현재 스테이지 (`Stage`), 라운드 정보 저장.
    *   투표 현황, 1:1 파트너 매핑 정보 유지.
    *   동시성 처리를 위해 내부적으로 Thread-safe한 자료구조 사용.

### 3.3 화상 통신 (`OpenViduService`)
*   **역할:** OpenVidu Server(Media Server)의 REST API를 래핑.
*   **Session:** 방 생성 시 `Session` 생성 (1개의 방 = 1개의 OpenVidu Session).
*   **Token:** 각 참가자마다 `Connection Token`을 발급받아 클라이언트에 전달.

---

## 🔄 4. 로테이션 엔진 (Rotation Engine)

미팅은 정해진 시나리오(8단계)에 따라 자동으로 진행됩니다.

### 4.1 전체 흐름 (8 Stages)
`StageScheduler`가 각 단계의 지속 시간을 관리하며 자동으로 `STAGE_CHANGE` 이벤트를 발행합니다.

1.  **WAITING**: 6명 전원 입장 대기. (전원 입장 시 자동 시작)
2.  **SELF_INTRO**: 자기소개. 6명이 돌아가며 발언권(`SPEAKER_CHANGE`)을 얻음 (각 5초+).
3.  **VOTE_FIRST**: 첫인상 투표.
4.  **ROTATION_SHORT**: 1:1 짧은 대화 (3분). 3번의 라운드 로빈.
5.  **ROTATION_LONG**: 1:1 긴 대화 (7분). 3번의 라운드 로빈 (이미지 게임 단계 건너뜀).
6.  **VOTE_FINAL**: 최종 선택 투표.
7.  **MATCHING_RESULT**: 최종 커플 매칭 결과 발표 및 DB 저장.
8.  **FACE_REVEAL**: 커플이 된 사용자들만 남아 얼굴 공개 (180초). 솔로는 강퇴.

### 4.2 실행 담당 (`StageExecutor`)
*   **Stage 진입 시:** 해당 스테이지에 필요한 초기화 작업 수행.
*   **Pairing:** `PairingStrategy`를 통해 라운드별 1:1 파트너 배정 (남녀 매칭).
*   **Event Publishing:** `RoomEventPublisher`를 통해 모든 참가자에게 JSON 메시지 브로드캐스트.

### 4.3 투표 로직
*   **First/Final Vote:** 클라이언트가 `SUBMIT_VOTE` 메시지 전송.
*   **집계:** `RoomState` 내부에 투표 결과 저장.
*   **결과 도출:** `calculateMatches()` 메서드가 서로 지목한 커플을 찾아냄.

---

## 🔌 5. 재연결 및 예외 처리 (Reconnection)

네트워크 불안정으로 인한 일시적 끊김을 처리하기 위한 로직입니다.

### 5.1 Disconnect Detection (`WebRtcWebSocketHandler`)
*   WebSocket 연결이 끊어지면(`afterConnectionClosed`) `RoomState`에서 해당 사용자를 "Disconnected" 상태로 마킹.
*   **Rotation 중일 때:** 즉시 삭제하지 않고 **유예 기간(Grace Period)** 부여.
*   **대기 중일 때:** 즉시 방에서 제거.

### 5.2 Grace Period (`DisconnectScheduler`)
*   **30초 대기:** `DisconnectScheduler`가 30초 타이머를 시작.
*   **재연결:** 30초 내에 사용자가 다시 `JOIN_ROOM`하면 타이머 취소 및 상태 복구.
*   **타임아웃:** 30초가 지나도 안 오면 영구 삭제 처리 및 파트너에게 `PARTNER_LEFT` 알림 전송.

---

## 💾 6. 데이터 영속성 (Persistence)

*   **매칭 완료 시:** `MatchService`가 MySQL DB(`Match` 테이블)에 성사된 매칭 정보를 저장.
*   **세션 상태:** `SessionRepository`를 통해 미팅방의 진행 상태(`WAITING` -> `ONGOING` -> `CLOSED`)를 DB에 반영.
*   **쪽지함:** `Match` 테이블에 저장된 정보를 바탕으로 사용자는 "쪽지함"에서 지난 매칭 상대를 확인 가능.
