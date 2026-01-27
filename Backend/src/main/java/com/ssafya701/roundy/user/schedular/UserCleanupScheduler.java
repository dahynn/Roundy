package com.ssafya701.roundy.user.schedular; // 패키지 위치는 원하시는 곳에

import com.ssafya701.roundy.user.enums.UserRole;
import com.ssafya701.roundy.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserCleanupScheduler {

    private final UserRepository userRepository;

    // 매일 새벽 4시에 실행
    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void cleanupGhostUsers() {
        // 24시간 전 시간 계산
        LocalDateTime cutOffTime = LocalDateTime.now().minusHours(24);
        // 삭제 실행
        userRepository.deleteByRoleAndCreatedAtBefore(UserRole.GUEST, cutOffTime);
    }
}