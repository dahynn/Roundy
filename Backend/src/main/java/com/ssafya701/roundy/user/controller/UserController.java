package com.ssafya701.roundy.user.controller;

import com.ssafya701.roundy.user.dto.UserSignUpRequest;
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
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Value("${app.frontend-url}")
    private String frontendUrl; // http://localhost:3000

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Value("${kakao.redirect-uri}")
    private String kakaoRedirectUri;

    // 1. 카카오 로그인 페이지로 리다이렉트 (프론트 버튼 클릭 시)
    @GetMapping("/kakao/page")
    public void redirectToKakao(HttpServletResponse response) throws IOException {
        String url = "https://kauth.kakao.com/oauth/authorize?client_id=" + kakaoClientId
                + "&redirect_uri=" + kakaoRedirectUri
                + "&response_type=code";
        response.sendRedirect(url);
    }

    // 2. 카카오 콜백 (백엔드 처리 -> 프론트로 리다이렉트)
    @GetMapping("/kakao/callback")
    public void kakaoCallback(@RequestParam String code, HttpServletResponse response) throws IOException {
        String token = userService.kakaoLogin(code);
        // 토큰을 URL에 붙여서 프론트엔드로 보냄
        response.sendRedirect(frontendUrl + "/auth/callback?token=" + token);
    }

    // 3. 회원가입 (폼 제출)
    @PostMapping(value = "/signup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> signUp(
            @RequestPart("data") UserSignUpRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal Long userId
    ) {
        String newToken = userService.signUp(userId, request, file);
        Map<String, String> result = new HashMap<>();
        result.put("accessToken", newToken);
        return ResponseEntity.ok(result);
    }
}