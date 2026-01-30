package com.ssafya701.roundy.auth.service;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.auth.dto.request.UserSignUpRequest;
import com.ssafya701.roundy.auth.dto.response.KakaoUserInfoResponse;
import com.ssafya701.roundy.auth.dto.response.TokenPair;
import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.GenderType;
import com.ssafya701.roundy.auth.enums.UserRole;
import com.ssafya701.roundy.auth.enums.UserStatus;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.auth.repository.UserPreferenceRepository;
import com.ssafya701.roundy.auth.entity.UserPreference;
import com.ssafya701.roundy.preference.entity.Preference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final KakaoService kakaoService;
    private final com.ssafya701.roundy.global.infra.minio.MinioService minioService;
    private final RedisTemplate<String, String> redisTemplate;
    private final UserPreferenceRepository userPreferenceRepository;
    private final com.ssafya701.roundy.preference.repository.PreferenceRepository preferenceRepository;

    @Transactional
    public String kakaoLogin(String code) {
        String kakaoToken = kakaoService.getAccessToken(code);
        KakaoUserInfoResponse userInfo = kakaoService.getUserInfo(kakaoToken);

        // 카카오 응답 검증
        if (userInfo == null || userInfo.getId() == null) {
            throw new CustomException(ErrorEnum.KAKAO_AUTH_FAILED);
        }

        // 생일 및 성별 데이터 가공
        LocalDate birthDate = parseBirthDate(userInfo);
        GenderType gender = parseGender(userInfo);

        User user = userRepository.findByKakaoId(userInfo.getId())
                .orElseGet(() -> userRepository.save(User.builder()
                        .kakaoId(userInfo.getId())
                        .email(userInfo.getKakaoAccount().getEmail())
                        .name(userInfo.getKakaoAccount().getName())
                        .birthDate(birthDate)
                        .gender(gender)
                        .role(UserRole.GUEST)
                        .status(UserStatus.JOINED) // 최초 로그인 시 단계
                        .build()));

        TokenPair tokenPair = issueTokens(user);
        return tokenPair.getAccessToken();
    }

    // 회원가입 -> 추가 정보 입력 (토큰 재발급 안 함, Role/Status 변경 없음)
    @Transactional
    public void signUp(Long userId, UserSignUpRequest request, MultipartFile file) {
        User user = findUserById(userId);
        
        // MinIO에 프로필 이미지 업로드 (경로 반환)
        String profilePath = minioService.uploadImage(userId, file, "profile");

        user.signUp(request.getNickName(), request.getGender(), request.getBirthDate(), request.getMbti(), profilePath);
        // 토큰 재발급 안 함 (Role: GUEST -> GUEST, Status: JOINED -> JOINED)
    }

    @Transactional
    public void uploadVerificationPhoto(Long userId, MultipartFile file) {
        User user = findUserById(userId);
        
        // MinIO에 인증용 이미지 업로드 (경로 반환)
        String verificationUrl = minioService.uploadImage(userId, file, "verification");

        user.uploadVerificationImage(verificationUrl);
    }

    // 온보딩 완료: 취향 정보 저장 및 상태 변경 (토큰 재발급 필요 - Role 변경)
    @Transactional
    public TokenPair completeOnboarding(Long userId, List<Long> preferenceIds) {
        User user = findUserById(userId);

        // Preference 유효성 검증 및 조회
        List<Preference> preferences = preferenceRepository.findAllById(preferenceIds);
        if (preferences.size() != preferenceIds.size()) {
            throw new CustomException(ErrorEnum.INVALID_INPUT);
        }

        // 타입별 개수 검증
        validatePreferenceCount(preferences, "RELATIONSHIP_GOAL", 2);
        validatePreferenceCount(preferences, "DATING_STYLE", 2);
        validatePreferenceCount(preferences, "DATE_PREFERENCE", 3);
        validatePreferenceCount(preferences, "PERSONALITY", 2);
        validatePreferenceCount(preferences, "APPEARANCE", 3);
        validatePreferenceCount(preferences, "TALENT", 2);

        // 기존 UserPreference 삭제 (재선택 가능하도록)
        userPreferenceRepository.deleteByUserId(userId);

        // 새로운 UserPreference 저장
        List<UserPreference> userPreferences = preferences.stream()
                .map(preference -> UserPreference.builder()
                        .user(user)
                        .preference(preference)
                        .build())
                .toList();

        userPreferenceRepository.saveAll(userPreferences);

        // User 상태를 VALID로 변경 (GUEST -> USER, JOINED -> VALID)
        user.authorizeUser();

        // 토큰 재발급 (Role이 변경되었으므로 필수)
        return issueTokens(user);
    }

    // 공통 유저 조회 메서드
    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));
    }

    // 생일 파싱 유틸
    private LocalDate parseBirthDate(KakaoUserInfoResponse userInfo) {
        String year = userInfo.getKakaoAccount().getBirthyear();
        String day = userInfo.getKakaoAccount().getBirthday();
        return (year != null && day != null)
                ? LocalDate.parse(year + day, DateTimeFormatter.ofPattern("yyyyMMdd"))
                : null;
    }

    // 성별 파싱 유틸
    private GenderType parseGender(KakaoUserInfoResponse userInfo) {
        String kakaoGender = userInfo.getKakaoAccount().getGender();
        return (kakaoGender != null)
                ? (kakaoGender.equalsIgnoreCase("male") ? GenderType.MALE : GenderType.FEMALE)
                : null;
    }

    // 토큰 재발급 (Refresh Token Rotation 적용)
    @Transactional
    public TokenPair reissueToken(String refreshToken) {
        // 1. RefreshToken 검증
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new CustomException(ErrorEnum.INVALID_TOKEN);
        }

        Long userId = jwtTokenProvider.getUserId(refreshToken);
        String storedRefreshToken = redisTemplate.opsForValue().get("RT:" + userId);

        // 2. Redis에 저장된 토큰과 일치하는지 확인
        if (storedRefreshToken == null || !storedRefreshToken.equals(refreshToken)) {
            // 같은 RefreshToken이 2번 사용됨 = 탈취 가능성 → 모든 토큰 무효화
            redisTemplate.delete("RT:" + userId);
            throw new CustomException(ErrorEnum.INVALID_TOKEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));

        // 3. 기존 RefreshToken 삭제 (RTR 핵심)
        redisTemplate.delete("RT:" + userId);

        // 4. 새 AccessToken + RefreshToken 모두 발급
        return issueTokens(user);
    }

    // 토큰 발급 공통 (AccessToken + RefreshToken 모두 반환)
    private TokenPair issueTokens(User user) {
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        // Redis에 RefreshToken 저장 (14일 유효)
        redisTemplate.opsForValue().set("RT:" + user.getId(), refreshToken, 14, TimeUnit.DAYS);

        return TokenPair.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    // 로그아웃
    @Transactional
    public void logout(Long userId) {
        redisTemplate.delete("RT:" + userId);
    }

    // 회원탈퇴
    @Transactional
    public void withdrawUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));
        kakaoService.unlink(user.getKakaoId());
        userRepository.delete(user);
        redisTemplate.delete("RT:" + userId);
    }

    /**
     * 특정 타입의 Preference 개수 검증 (정확히)
     */
    private void validatePreferenceCount(List<Preference> preferences, String type, int expectedCount) {
        long count = preferences.stream()
                .filter(p -> p.getType().name().equals(type)) // enum의 name()과 비교
                .count();

        if (count != expectedCount) { // 정확히 N개
            throw new CustomException(ErrorEnum.INVALID_PREFERENCE_COUNT);
        }
    }
}