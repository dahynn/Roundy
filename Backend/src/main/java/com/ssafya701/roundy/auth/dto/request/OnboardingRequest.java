package com.ssafya701.roundy.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@Schema(description = "온보딩 요청 DTO")
public class OnboardingRequest {

    @NotEmpty(message = "취향 정보는 최소 1개 이상 선택해야 합니다.")
    @Schema(description = "선택한 Preference ID 목록", example = "[1, 2, 3, 4, 5, 6, 7]")
    private List<Long> preferenceIds;
}
