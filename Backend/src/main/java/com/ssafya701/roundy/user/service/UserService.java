package com.ssafya701.roundy.user.service;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.global.util.FileUploader;
import com.ssafya701.roundy.user.dto.request.UserSignUpRequest;
import com.ssafya701.roundy.user.dto.response.KakaoUserInfoResponse;
import com.ssafya701.roundy.user.entity.User;
import com.ssafya701.roundy.user.enums.GenderType;
import com.ssafya701.roundy.user.enums.UserRole;
import com.ssafya701.roundy.user.enums.UserStatus;
import com.ssafya701.roundy.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final KakaoService kakaoService;
    private final FileUploader fileUploader;
    private final RedisTemplate<String, String> redisTemplate;

    @Transactional
    public String kakaoLogin(String code) {
        String kakaoToken = kakaoService.getAccessToken(code);
        KakaoUserInfoResponse userInfo = kakaoService.getUserInfo(kakaoToken);

        // 생일 및 성별 데이터 가공
        LocalDate birthDate = parseBirthDate(userInfo);
        GenderType gender = parseGender(userInfo);

        User user = userRepository.findByKakaoId(userInfo.getId())
                .orElseGet(() -> userRepository.save(User.builder()
                        .kakaoId(userInfo.getId())
                        .email(userInfo.getKakaoAccount().getEmail())
                        .name(userInfo.getKakaoAccount().getName() )
                        .birthDate(birthDate)
                        .gender(gender)
                        .role(UserRole.GUEST)
                        .status(UserStatus.JOINED) // 최초 로그인 시 단계
                        .build()));

        return issueTokens(user);




    }

    // 회원가입 -> 추가 정보 입력
    @Transactional
    public String signUp(Long userId, UserSignUpRequest request, MultipartFile file) {
        User user = findUserById(userId);
        String profilePath = fileUploader.upload(file);


        user.signUp(request.getNickName(), request.getGender(), request.getBirthDate(), request.getMbti(), profilePath);

        return issueTokens(user);
    }

    @Transactional
    public void uploadVerificationPhoto(Long userId, MultipartFile file) {
        User user = findUserById(userId);
        String verificationUrl = fileUploader.upload(file);

        user.uploadVerificationImage(verificationUrl);
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
                ? LocalDate.parse(year + day, DateTimeFormatter.ofPattern("yyyyMMdd")) : null;
    }

    // 성별 파싱 유틸
    private GenderType parseGender(KakaoUserInfoResponse userInfo) {
        String kakaoGender = userInfo.getKakaoAccount().getGender();
        return (kakaoGender != null)
                ? (kakaoGender.equalsIgnoreCase("male") ? GenderType.MALE : GenderType.FEMALE) : null;
    }

    // 토큰재발급
    @Transactional
    public String reissueToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new CustomException(ErrorEnum.INVALID_TOKEN);
        }
        Long userId = jwtTokenProvider.getUserId(refreshToken);
        String storedRefreshToken = redisTemplate.opsForValue().get("RT:" + userId);

        if (storedRefreshToken == null || !storedRefreshToken.equals(refreshToken)) {
            throw new CustomException(ErrorEnum.INVALID_TOKEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));

        return jwtTokenProvider.createAccessToken(user.getId(), user.getRole());
    }

    // 토큰 발급 공통
    private String issueTokens(User user) {
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        redisTemplate.opsForValue().set("RT:" + user.getId(), refreshToken, 14, TimeUnit.DAYS);
        return accessToken;
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
}