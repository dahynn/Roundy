package com.ssafya701.roundy.user.service;

import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.global.util.FileUploader;
import com.ssafya701.roundy.user.dto.response.KakaoUserInfoResponse;
import com.ssafya701.roundy.user.dto.request.UserSignUpRequest;
import com.ssafya701.roundy.user.entity.User;
import com.ssafya701.roundy.user.enums.UserRole;
import com.ssafya701.roundy.user.enums.UserStatus;
import com.ssafya701.roundy.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final KakaoService kakaoService;
    private final FileUploader fileUploader;

    @Transactional
    public String kakaoLogin(String code) {
        String kakaoToken = kakaoService.getAccessToken(code);
        KakaoUserInfoResponse userInfo = kakaoService.getUserInfo(kakaoToken);
        Long kakaoId = userInfo.getId();

        // 없으면 GUEST로 저장, 있으면 조회
        User user = userRepository.findByKakaoId(kakaoId)
                .orElseGet(() -> userRepository.save(User.builder()
                        .kakaoId(kakaoId)
                        .email(userInfo.getKakaoAccount().getEmail())
                        .name(userInfo.getKakaoAccount().getProfile().getNickname())
                        .role(UserRole.GUEST)
                        .status(UserStatus.JOINED)
                        .build()));

        return jwtTokenProvider.createToken(user.getId(), user.getRole(), user.getStatus());
    }

    @Transactional
    public String signUp(Long userId, UserSignUpRequest request, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저 없음"));

        String profilePath = fileUploader.upload(file);

        // GUEST -> USER 정보 업데이트
        user.signUp(
                request.getNickName(),
                request.getGender(),
                request.getBirthYear(),
                request.getBirthDay(),
                request.getMbti(),
                profilePath
        );

        // ROLE 이 USER 로 변경됨에 따라 새 토큰 발급
        return jwtTokenProvider.createToken(user.getId(), user.getRole(), user.getStatus());
    }
}