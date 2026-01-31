package com.ssafya701.roundy.preference.dto.response;

import com.ssafya701.roundy.preference.enums.PreferenceType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
@Schema(description = "사용자 Preference 응답 DTO (타입별 그룹핑)")
public class UserPreferenceResponse {

    @Schema(description = "타입별 Preference 내용 리스트")
    private Map<PreferenceType, List<String>> preferences;
}
