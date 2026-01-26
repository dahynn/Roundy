package com.ssafya701.roundy.user.controller;

import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.user.dto.request.UserSignUpRequest;
import com.ssafya701.roundy.user.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Value("${kakao.redirect-uri}")
    private String kakaoRedirectUri;

    // 카카오 로그인
    @GetMapping("/login")
    public void redirectToKakao(HttpServletResponse response) throws IOException {
        String url = "https://kauth.kakao.com/oauth/authorize?client_id=" + kakaoClientId
                + "&redirect_uri=" + kakaoRedirectUri
                + "&response_type=code";
        response.sendRedirect(url);
    }

    // 이건 프론트에서 처리할 필요 없음
    // TODO: Swagger 에서 hidden 처리 하기
    @GetMapping("/kakao/callback")
    public void kakaoCallback(@RequestParam String code, HttpServletResponse response) throws IOException {
        String token = userService.kakaoLogin(code);
        // 토큰을 URL에 붙여서 프론트엔드로 보냄
        response.sendRedirect(frontendUrl + "/auth/callback?token=" + token);
    }

    // 회원가입
    @PostMapping(value = "/signup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> signUp(
            @RequestPart("data") UserSignUpRequest request,
            @RequestPart(value = "file") MultipartFile file,
            @AuthenticationPrincipal Long userId
    ) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("프로필 사진은 필수입니다.");
        }

        String newToken = userService.signUp(userId, request, file);

        Map<String, String> result = new HashMap<>();
        result.put("accessToken", newToken);

        return ResponseEntity.ok(CommonResponse.ofSuccess(result));
    }
}