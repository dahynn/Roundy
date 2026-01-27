package com.ssafya701.roundy.user.controller;

import com.ssafya701.roundy.global.auth.PrincipalDetails;
import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.user.dto.request.UserSignUpRequest;
import com.ssafya701.roundy.user.service.UserService;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.ssafya701.roundy.user.dto.response.UserSignupDetailResponse; // DTO 이름 확인!

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "인증/유저 API", description = "카카오 로그인, 회원가입, 토큰 관리 API")
public class UserController {

    private final UserService userService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Value("${kakao.redirect-uri}")
    private String kakaoRedirectUri;

    // 카카오 로그인
    @Operation(summary = "카카오 로그인", description = "카카오 인증 서버로 리다이렉트합니다. (프론트엔드에서 직접 링크 걸어도 됨)")
    @GetMapping("/login")
    public void redirectToKakao(HttpServletResponse response) throws IOException {
        String url = "https://kauth.kakao.com/oauth/authorize?client_id=" + kakaoClientId
                + "&redirect_uri=" + kakaoRedirectUri
                + "&response_type=code";
        response.sendRedirect(url);
    }


    @Hidden
    @GetMapping("/kakao/callback")
    public void kakaoCallback(@RequestParam String code, HttpServletResponse response) throws IOException {
        String token = userService.kakaoLogin(code);
        response.sendRedirect(frontendUrl + "/auth/callback?token=" + token);
    }

    // 회원가입 전, 카카오에서 받은 정보 불러오기
    @Operation(summary = "가입 전 초기 정보 조회", description = "카카오에서 가져온 이름, 성별, 생년월일을 미리 보여주기 위해 조회합니다.")
    @GetMapping("/signup/details")
    public ResponseEntity<?> getRegistrationDetails(
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {
        com.ssafya701.roundy.user.entity.User user = principal.getUser();

        return ResponseEntity.ok(CommonResponse.ofSuccess(UserSignupDetailResponse.from(user)));
    }

    // 회원가입 : 추가 정보 입력
    @Operation(summary = "회원가입", description = "추가 정보(닉네임, MBTI 등)와 프로필 사진을 받아 가입을 완료합니다.")
    @PostMapping(value = "/signup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> signUp(
            @Parameter(description = "회원가입 정보 (JSON)", required = true, content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE)) @RequestPart("data") UserSignUpRequest request,
            @Parameter(description = "프로필 이미지 파일", required = true) @RequestPart(value = "file") MultipartFile file,
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal // 사용자 입력 X, 숨김 처리
    ) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("프로필 사진은 필수입니다.");
        }

        String accessToken = userService.signUp(principal.getUser().getId(), request, file);

        Map<String, String> result = new HashMap<>();
        result.put("accessToken", accessToken);

        return ResponseEntity.ok(CommonResponse.ofSuccess(result));
    }

    // 검증용 사진 업로드
    @Operation(summary = "검증용 사진 업로드", description = "본인 확인을 위한 검증용 사진을 업로드합니다. (상태: PENDING_VERIFICATION)")
    @PostMapping(value = "/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadVerificationPhoto(
            @Parameter(description = "검증용 이미지 파일", required = true) @RequestPart(value = "file") MultipartFile file,
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("검증용 사진은 필수입니다.");
        }

        userService.uploadVerificationPhoto(principal.getUser().getId(), file);

        return ResponseEntity.ok(CommonResponse.ofSuccess("검증 사진 등록 완료"));
    }

    // 토큰 재발급
    @Operation(summary = "토큰 재발급", description = "Refresh Token을 사용하여 새로운 Access Token을 발급받습니다.")
    @PostMapping("/re-issue")
    public ResponseEntity<?> reissue(
            @Parameter(description = "Refresh Token (Bearer ...)", required = true)
            @RequestHeader("Authorization") String refreshToken) {

        // Bearer 제거 로직
        if (refreshToken != null && refreshToken.startsWith("Bearer ")) {
            refreshToken = refreshToken.substring(7);
        }

        String newAccessToken = userService.reissueToken(refreshToken);

        Map<String, String> result = new HashMap<>();
        result.put("accessToken", newAccessToken);

        return ResponseEntity.ok(CommonResponse.ofSuccess(result));
    }

    // 로그아웃
    @Operation(summary = "로그아웃", description = "Redis에서 Refresh Token을 삭제하여 로그아웃 처리합니다.")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {
        userService.logout(principal.getUser().getId());
        return ResponseEntity.ok(CommonResponse.ofSuccess());
    }

    // 회원 탈퇴
    @Operation(summary = "회원 탈퇴", description = "카카오 연결 끊기 및 DB에서 회원 정보를 삭제합니다.")
    @DeleteMapping("/withdraw")
    public ResponseEntity<?> withdraw(
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {
        userService.withdrawUser(principal.getUser().getId());
        return ResponseEntity.ok(CommonResponse.ofSuccess());
    }
}