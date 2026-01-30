package com.ssafya701.roundy.webrtc.room;

import com.ssafya701.roundy.webrtc.room.enums.Gender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

/**
 * Gender 검증 테스트
 */
@DisplayName("Gender 검증 테스트")
class GenderValidationTest {
    
    @Test
    @DisplayName("Gender enum이 MALE과 FEMALE을 가지고 있다")
    void testGenderEnum() {
        assertThat(Gender.values()).hasSize(2);
        assertThat(Gender.MALE).isNotNull();
        assertThat(Gender.FEMALE).isNotNull();
    }
}
