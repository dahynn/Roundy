package com.ssafya701.roundy.user.service;

import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.global.util.FileUploader;
import com.ssafya701.roundy.user.dto.UserSignUpRequest;
import com.ssafya701.roundy.user.entity.User;
import com.ssafya701.roundy.user.enums.UserRole;
import com.ssafya701.roundy.user.enums.UserStatus;
import com.ssafya701.roundy.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final KakaoService kakaoService; // 아래에 구현
    private final FileUploader fileUploader;

    @Transactional
    public String kakaoLogin(String authCode) {
        String kakaoAccessToken = kakaoService.getAccessToken(authCode);

        var kakaoUserInfo = kakaoService.getUserInfo(kakaoAccessToken);

        User user = userRepository.findByKakaoId(kakaoUserInfo.getId())
                .orElseGet(() -> userRepository.save(User.builder()
                        .kakaoId(kakaoUserInfo.getId())
                        .email(kakaoUserInfo.getKakaoAccount().getEmail())
                        .name(kakaoUserInfo.getKakaoAccount().getProfile().getNickname()) // 이름은 여기서 고정
                        // 초기값 설정
                        .role(UserRole.USER)
                        .status(UserStatus.JOINED)
                        .build()));

        return jwtTokenProvider.createToken(user.getId(), user.getRole(), user.getStatus());
    }

    @Transactional
    public String signUp(Long userId, UserSignUpRequest request, MultipartFile profileImage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저 없음"));

        String imagePath = fileUploader.upload(profileImage);

        user.signUp(
                request.getName(),
                request.getGender(),
                request.getBirthYear(),
                request.getBirthDay(),
                request.getMbti(),
                imagePath
        );

        // 주의: 설계상 여기서 바로 APPROVED가 되는 게 아니라,
        // 이 정보를 바탕으로 '인증 서비스'를 거쳐야 한다면 Status는 유지하거나
        // 인증 대기 상태로 두어야 함. 여기선 로직상 정보 저장만 수행.

        // 갱신된 정보가 담긴 토큰 재발급
        return jwtTokenProvider.createToken(user.getId(), user.getRole(), user.getStatus());
    }
}