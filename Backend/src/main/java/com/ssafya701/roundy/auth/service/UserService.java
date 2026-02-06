package com.ssafya701.roundy.auth.service;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.auth.dto.request.UserSignUpRequest;
import com.ssafya701.roundy.auth.dto.response.KakaoUserInfoResponse;
import com.ssafya701.roundy.auth.dto.response.TokenPair;
import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.UserRole;
import com.ssafya701.roundy.auth.enums.UserStatus;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.auth.repository.UserPreferenceRepository;
import com.ssafya701.roundy.auth.entity.UserPreference;
import com.ssafya701.roundy.preference.entity.Preference;
import com.ssafya701.roundy.global.infra.minio.MinioService;
import com.ssafya701.roundy.preference.repository.PreferenceRepository;
import com.ssafya701.roundy.preference.enums.PreferenceType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final KakaoService kakaoService;
    private final MinioService minioService;
    private final RedisTemplate<String, String> redisTemplate;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PreferenceRepository preferenceRepository;

    @Transactional
    public String kakaoLogin(String code) {
        String kakaoToken = kakaoService.getAccessToken(code);
        KakaoUserInfoResponse userInfo = kakaoService.getUserInfo(kakaoToken);

        // 카카오 응답 검증
        if (userInfo == null || userInfo.getId() == null) {
            throw new CustomException(ErrorEnum.KAKAO_AUTH_FAILED);
        }

        // 카카오 프로필 닉네임 추출 (Null Safety)
        String kakaoProfileName = "Unknown";
        String email = "";

        if (userInfo.getKakaoAccount() != null) {
            email = userInfo.getKakaoAccount().getEmail();
            if (userInfo.getKakaoAccount().getProfile() != null) {
                kakaoProfileName = userInfo.getKakaoAccount().getProfile().getNickname();
            }
        }

        // DB 저장 혹은 조회
        String finalKakaoProfileName = kakaoProfileName;
        String finalEmail = email;

        User user = userRepository.findByKakaoId(userInfo.getId())
                .orElseGet(() -> userRepository.save(User.builder()
                        .kakaoId(userInfo.getId())
                        .email(finalEmail)
                        .name(finalKakaoProfileName) // 식별용 이름 (카카오 닉네임)
                        .nickName(null) // 앱 전용 닉네임 (signUp에서 설정)
                        .birthDate(null) // signUp에서 설정
                        .gender(null) // signUp에서 설정
                        .role(UserRole.GUEST)
                        .status(UserStatus.JOINED)
                        .build()));

        TokenPair tokenPair = issueTokens(user);
        return tokenPair.getAccessToken();
    }

    @Transactional
    public void signUp(Long userId, UserSignUpRequest request, MultipartFile file) {
        User user = findUserById(userId);

        // MinIO에 프로필 이미지 업로드
        String profilePath = minioService.uploadImage(userId, file, "profile");

        // 앱 전용 닉네임, 성별, 생일 등 설정
        user.signUp(request.getNickName(), request.getGender(), request.getBirthDate(), request.getMbti(), profilePath);
    }

    // 프로필 정보 수정 (기본 정보 + 검증 사진)
    @Transactional
    public void updateProfile(Long userId, UserSignUpRequest request, MultipartFile profileFile,
            MultipartFile verificationFile) {
        User user = findUserById(userId);

        // 1. 기본 정보 수정
        if (request != null) {
            user.updateBasicInfo(request.getNickName(), request.getMbti(), request.getGender());
        }

        // 2. 프로필 이미지 수정
        if (profileFile != null && !profileFile.isEmpty()) {
            String profilePath = minioService.uploadImage(userId, profileFile, "profile");
            user.updateProfileImage(profilePath);
        }

        // 3. 검증용 사진 수정 (업로드 시 검증 대기 상태로 변경됨)
        if (verificationFile != null && !verificationFile.isEmpty()) {
            String verificationPath = minioService.uploadImage(userId, verificationFile, "verification");
            user.uploadVerificationImage(verificationPath);
        }
    }

    @Transactional
    public void uploadVerificationPhoto(Long userId, MultipartFile file) {
        User user = findUserById(userId);
        String verificationUrl = minioService.uploadImage(userId, file, "verification");
        user.uploadVerificationImage(verificationUrl);
    }

    // 온보딩 완료
    @Transactional
    public TokenPair completeOnboarding(Long userId, List<Long> preferenceIds) {
        User user = findUserById(userId);

        List<Preference> preferences = preferenceRepository.findAllById(preferenceIds);
        if (preferences.size() != preferenceIds.size()) {
            throw new CustomException(ErrorEnum.INVALID_INPUT);
        }

        validatePreferenceCount(preferences, "RELATIONSHIP_GOAL", 2);
        validatePreferenceCount(preferences, "DATING_STYLE", 2);
        validatePreferenceCount(preferences, "DATE_PREFERENCE", 3);
        validatePreferenceCount(preferences, "PERSONALITY", 2);
        validatePreferenceCount(preferences, "APPEARANCE", 3);
        validatePreferenceCount(preferences, "TALENT", 2);

        userPreferenceRepository.deleteByUserId(userId);

        List<UserPreference> userPreferences = preferences.stream()
                .map(preference -> UserPreference.builder()
                        .user(user)
                        .preference(preference)
                        .build())
                .toList();

        userPreferenceRepository.saveAll(userPreferences);

        user.authorizeUser(); // GUEST -> USER 변경
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public String getImageUrl(Long userId, String type) {
        return minioService.getImageUrl(userId, type);
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));
    }

    // 토큰 재발급
    @Transactional
    public TokenPair reissueToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new CustomException(ErrorEnum.INVALID_TOKEN);
        }

        Long userId = jwtTokenProvider.getUserId(refreshToken);
        String storedRefreshToken = redisTemplate.opsForValue().get("RT:" + userId);

        if (storedRefreshToken == null || !storedRefreshToken.equals(refreshToken)) {
            redisTemplate.delete("RT:" + userId);
            throw new CustomException(ErrorEnum.INVALID_TOKEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));

        redisTemplate.delete("RT:" + userId);
        return issueTokens(user);
    }

    private TokenPair issueTokens(User user) {
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        redisTemplate.opsForValue().set("RT:" + user.getId(), refreshToken, 14, TimeUnit.DAYS);

        return TokenPair.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    @Transactional
    public void logout(Long userId) {
        redisTemplate.delete("RT:" + userId);
    }

    @Transactional
    public void withdrawUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));
        if (user.getKakaoId() != null) {
            kakaoService.unlink(user.getKakaoId());
        }
        user.withdraw();
        redisTemplate.delete("RT:" + userId);
    }

    private void validatePreferenceCount(List<Preference> preferences, String type, int expectedCount) {
        long count = preferences.stream()
                .filter(p -> p.getType().name().equals(type))
                .count();

        if (count != expectedCount) {
            String errorMessage = String.format("%s 항목은 %d개를 선택해야 합니다. (현재: %d개)",
                    convertToKorean(PreferenceType.valueOf(type)), expectedCount, count);
            throw new CustomException(ErrorEnum.INVALID_PREFERENCE_COUNT, errorMessage);
        }
    }

    private String convertToKorean(PreferenceType type) {
        return switch (type) {
            case RELATIONSHIP_GOAL -> "연애 목표";
            case DATING_STYLE -> "데이트 스타일";
            case DATE_PREFERENCE -> "선호 데이트";
            case PERSONALITY -> "성격";
            case APPEARANCE -> "외모";
            case TALENT -> "재능/특기";
        };
    }
}