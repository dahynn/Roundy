package com.ssafya701.roundy.preference.controller;

import com.ssafya701.roundy.global.auth.PrincipalDetails;
import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.preference.dto.response.PreferenceResponse;
import com.ssafya701.roundy.preference.dto.response.UserPreferenceResponse;
import com.ssafya701.roundy.preference.service.PreferenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
