package com.ssafya701.roundy.preference.dto.response;

import com.ssafya701.roundy.preference.entity.Preference;
import com.ssafya701.roundy.preference.enums.PreferenceType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Schema(description = "Preference 응답 DTO")
public class PreferenceResponse {

    @Schema(description = "Preference ID", example = "1")
    private Long id;

    @Schema(description = "Preference 타입", example = "RELATIONSHIP_GOAL")
    private PreferenceType type;

    @Schema(description = "Preference 내용", example = "결혼 의향도 있어요")
    private String content;

    public static PreferenceResponse from(Preference preference) {
        return new PreferenceResponse(
                preference.getId(),
                preference.getType(),
                preference.getContent());
    }
}
