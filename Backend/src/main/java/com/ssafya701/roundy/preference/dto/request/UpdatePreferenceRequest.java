package com.ssafya701.roundy.preference.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@Schema(description = "선호도 수정 요청 DTO")
public class UpdatePreferenceRequest {

    @NotEmpty(message = "선호도는 최소 1개 이상 선택해야 합니다.")
    @Schema(description = "수정할 Preference ID 목록 (14개)", example = "[1, 2, 6, 7, 17, 18, 19, 35, 36, 58, 59, 60, 75, 76]")
    private List<Long> preferenceIds;
}
