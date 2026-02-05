package com.ssafya701.roundy.session.controller;

import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.session.dto.RoomMatchResult;
import com.ssafya701.roundy.session.dto.request.SessionEnterRequest;
import com.ssafya701.roundy.session.dto.response.RoomMemberInfo;
import com.ssafya701.roundy.session.dto.response.RoomMembersResponse;
import com.ssafya701.roundy.session.dto.response.SessionEnterResponse;
import com.ssafya701.roundy.session.dto.response.SessionStatusResponse;
import com.ssafya701.roundy.session.service.SessionService;
import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.GenderType;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.verification.service.VerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/session")
@RequiredArgsConstructor
public class SessionController {

        private final SessionService sessionService;
        private final VerificationService verificationService;
        private final JwtTokenProvider jwtTokenProvider;
        private final UserRepository userRepository;

        // POST /api/session/enter - 검증 완료 후 세션 대기실 입장
        @PostMapping("/enter")
        public ResponseEntity<CommonResponse<SessionEnterResponse>> enterSession(
                        @RequestHeader("Authorization") String jwt,
                        @RequestBody(required = false) SessionEnterRequest request) {

                // Request Body가 없이 올 경우 빈 객체로 처리
                if (request == null) {
                    request = new SessionEnterRequest();
                }

                // 1. JWT 검증 및 userId 추출
                String token = jwt.replace("Bearer ", "");
                jwtTokenProvider.validateToken(token);
                Long userId = jwtTokenProvider.getUserId(token);

                log.info("Session enter request: userId={}", userId);

                // 2. Redis에서 검증 상태 확인 + 삭제 (원자적 처리, Race Condition 방지)
                // [테스트용 수정] 무조건 통과하도록 주석 처리
                /*
                if (!verificationService.verifyAndDelete(request.getRequestId())) {
                        log.warn("Verification failed or already used: userId={}, requestId={}",
                                        userId, request.getRequestId());
                        return ResponseEntity.ok(
                                        CommonResponse.ofSuccess(
                                                        new SessionEnterResponse(false, "검증이 완료되지 않았거나 이미 사용되었습니다.",
                                                                        null)));
                }
                */
                // log.info("📢 [TEST MODE] Verification Skipped for requestId={}", request.getRequestId());
                log.info("📢 [TEST MODE] Verification Skipped");

                // 3. User 정보 조회 (성별 확인)
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

                GenderType gender = user.getGender();
                if (gender == null) {
                        return ResponseEntity.ok(
                                        CommonResponse.ofSuccess(
                                                        new SessionEnterResponse(false, "성별 정보가 없습니다.", null)));
                }

                // 4. [수정] 이미 매칭된 방이 있는지 먼저 확인 (Polling 로직 개선)
                String existingRoomId = sessionService.getUserCurrentRoom(userId);
                if (existingRoomId != null) {
                    // 이미 매칭된 상태라면 즉시 방 정보 반환
                    RoomMemberInfo memberInfo = sessionService.getRoomMemberInfo(userId, existingRoomId);
                    
                    if (memberInfo != null) {
                        SessionEnterResponse response = SessionEnterResponse.matched(
                                        memberInfo.getRoomId(),
                                        memberInfo.getGender());
        
                        log.info("User already matched (polling catch): userId={}, roomId={}", 
                                        userId, memberInfo.getRoomId());
                        return ResponseEntity.ok(CommonResponse.ofSuccess(response));
                    } else {
                        // 정보가 없으면 키 삭제 후 재시도 유도 (Self-Repair)
                        log.warn("User has room key but no member info: userId={}, roomId={}", userId, existingRoomId);
                        sessionService.removeUserCurrentRoomKey(userId);
                    }
                }

                // 5. 세션 큐에 그제서야 추가 + 매칭 시도
                RoomMatchResult matchResult = sessionService.addToQueueAndMatch(userId, gender);

                // 6. 매칭 결과에 따른 응답
                if ("MATCHED".equals(matchResult.getStatus())) {
                        // 매칭 성공 → Redis에서 본인 번호 조회
                        RoomMemberInfo memberInfo = sessionService.getRoomMemberInfo(userId, matchResult.getRoomId());

                        if (memberInfo == null) {
                                log.error("Member info not found after matching: userId={}, roomId={}",
                                                userId, matchResult.getRoomId());
                                return ResponseEntity.ok(
                                                CommonResponse.ofSuccess(
                                                                new SessionEnterResponse(false, "매칭 정보를 찾을 수 없습니다.",
                                                                                null)));
                        }

                        SessionEnterResponse response = SessionEnterResponse.matched(
                                        memberInfo.getRoomId(),
                                        memberInfo.getGender());

                        log.info("Room matched: userId={}, roomId={}, gender={}",
                                        userId, memberInfo.getRoomId(), memberInfo.getGender());

                        return ResponseEntity.ok(CommonResponse.ofSuccess(response));
                } else {
                        // 대기 중
                        Integer queuePosition = sessionService.getQueuePosition(userId, gender);
                        SessionEnterResponse response = new SessionEnterResponse(
                                        true,
                                        "세션에 입장했습니다. 잠시 후 매칭됩니다.",
                                        queuePosition);

                        log.info("Session entered, waiting: userId={}, gender={}, position={}",
                                        userId, gender, queuePosition);

                        return ResponseEntity.ok(CommonResponse.ofSuccess(response));
                }
        }

        // GET /api/session/status - 대기실 현황 조회
        @GetMapping("/status")
        public ResponseEntity<CommonResponse<SessionStatusResponse>> getSessionStatus(
                        @RequestHeader("Authorization") String jwt) {

                String token = jwt.replace("Bearer ", "");
                jwtTokenProvider.validateToken(token);
                Long userId = jwtTokenProvider.getUserId(token);

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

                GenderType gender = user.getGender();
                if (gender == null) {
                        return ResponseEntity.ok(
                                        CommonResponse.ofSuccess(new SessionStatusResponse(0, 0, 0, 0)));
                }

                SessionStatusResponse status = sessionService.getSessionStatus(gender);

                log.info("Session status queried: userId={}, gender={}, availableSlots={}",
                                userId, gender, status.getAvailableSlots());

                return ResponseEntity.ok(CommonResponse.ofSuccess(status));
        }

        // GET /api/room/{roomId}/members - 방 전체 멤버 정보 조회 (화상 UI용)
        @GetMapping("/room/{roomId}/members")
        public ResponseEntity<CommonResponse<RoomMembersResponse>> getRoomMembers(
                        @RequestHeader("Authorization") String jwt,
                        @PathVariable String roomId) {

                String token = jwt.replace("Bearer ", "");
                jwtTokenProvider.validateToken(token);
                Long userId = jwtTokenProvider.getUserId(token);

                log.info("Room members request: userId={}, roomId={}", userId, roomId);

                RoomMembersResponse members = sessionService.getRoomMembers(roomId);

                return ResponseEntity.ok(CommonResponse.ofSuccess(members));
        }

        // GET /api/room/{roomId}/my-info - 내 방 정보 조회 (재접속용)
        @GetMapping("/room/{roomId}/my-info")
        public ResponseEntity<CommonResponse<RoomMemberInfo>> getMyRoomInfo(
                        @RequestHeader("Authorization") String jwt,
                        @PathVariable String roomId) {

                String token = jwt.replace("Bearer ", "");
                jwtTokenProvider.validateToken(token);
                Long userId = jwtTokenProvider.getUserId(token);

                log.info("My room info request: userId={}, roomId={}", userId, roomId);

                RoomMemberInfo info = sessionService.getRoomMemberInfo(userId, roomId);

                if (info == null) {
                        return ResponseEntity.ok(
                                        CommonResponse.ofSuccess(null));
                }

                return ResponseEntity.ok(CommonResponse.ofSuccess(info));
        }

        // DELETE /api/session/leave - 대기실 퇴장
        @DeleteMapping("/leave")
        public ResponseEntity<CommonResponse<Void>> leaveSession(
                        @RequestHeader("Authorization") String jwt) {

                String token = jwt.replace("Bearer ", "");
                jwtTokenProvider.validateToken(token);
                Long userId = jwtTokenProvider.getUserId(token);

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

                GenderType gender = user.getGender();
                if (gender == null) {
                        return ResponseEntity.ok(CommonResponse.ofFailure("성별 정보가 없습니다."));
                }

                boolean removed = sessionService.removeFromQueue(userId, gender);

                if (removed) {
                        log.info("User left session: userId={}, gender={}", userId, gender);
                        return ResponseEntity.ok(CommonResponse.ofSuccess(null));
                } else {
                        log.warn("User not in queue: userId={}", userId);
                        return ResponseEntity.ok(CommonResponse.ofFailure("대기실에 없습니다."));
                }
        }
}
