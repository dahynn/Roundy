package com.ssafya701.roundy.preference.controller;

import com.ssafya701.roundy.global.auth.PrincipalDetails;
import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.preference.dto.response.PreferenceResponse;
import com.ssafya701.roundy.preference.dto.response.UserPreferenceResponse;
import com.ssafya701.roundy.preference.dto.request.UpdatePreferenceRequest;
import com.ssafya701.roundy.preference.service.PreferenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/preferences")
@RequiredArgsConstructor
@Tag(name = "Preference API", description = "취향 정보 조회 API")
public class PreferenceController {

    private final PreferenceService preferenceService;

    @Operation(summary = "전체 Preference 조회", description = "온보딩 화면에서 선택지를 표시하기 위한 모든 Preference 조회")
    @GetMapping
    public ResponseEntity<?> getAllPreferences() {
        List<PreferenceResponse> preferences = preferenceService.getAllPreferences();
        return ResponseEntity.ok(CommonResponse.ofSuccess(preferences));
    }

    @Operation(summary = "내 Preference 조회", description = "현재 사용자가 선택한 Preference 조회 (타입별 그룹핑)")
    @GetMapping("/me")
    public ResponseEntity<?> getMyPreferences(
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal) {
        UserPreferenceResponse preferences = preferenceService.getUserPreferences(principal.getUser().getId());
        return ResponseEntity.ok(CommonResponse.ofSuccess(preferences));
    }

    @Operation(summary = "특정 유저 Preference 조회", description = "지정한 유저 ID의 Preference 조회 (매칭 화면에서 상대방 정보 표시용)")
    @GetMapping("/{userId}")
    public ResponseEntity<?> getPreferencesByUserId(
            @Parameter(description = "조회할 유저 ID", required = true) @PathVariable Long userId) {
        UserPreferenceResponse preferences = preferenceService.getUserPreferences(userId);
        return ResponseEntity.ok(CommonResponse.ofSuccess(preferences));
    }

    @Operation(summary = "내 Preference 수정", description = "현재 사용자의 Preference 수정 (마이페이지용, 토큰 재발급 없음)")
    @PutMapping("/me")
    public ResponseEntity<?> updateMyPreferences(
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal,
            @Parameter(description = "수정할 Preference ID 목록 (14개)", required = true) 
            @Valid @RequestBody UpdatePreferenceRequest request) {
        preferenceService.updateUserPreferences(principal.getUser().getId(), request.getPreferenceIds());
        return ResponseEntity.ok(CommonResponse.ofSuccess("선호도 수정 완료"));
    }
}
