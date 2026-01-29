package com.ssafya701.roundy.webrtc.room.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

/**
 * Stage Enum 단위 테스트
 */
@DisplayName("Stage Enum 테스트")
class StageTest {
    
    @Test
    @DisplayName("Stage 순서가 올바르게 정의되어 있다")
    void testStageOrder() {
        assertThat(Stage.WAITING.getOrder()).isEqualTo(0);
        assertThat(Stage.SELF_INTRO.getOrder()).isEqualTo(1);
        assertThat(Stage.VOTE_FIRST.getOrder()).isEqualTo(2);
        assertThat(Stage.ROTATION_SHORT.getOrder()).isEqualTo(3);
        assertThat(Stage.IMAGE_GAME.getOrder()).isEqualTo(4);
        assertThat(Stage.ROTATION_LONG.getOrder()).isEqualTo(5);
        assertThat(Stage.VOTE_FINAL.getOrder()).isEqualTo(6);
        assertThat(Stage.MATCHING_RESULT.getOrder()).isEqualTo(7);
        assertThat(Stage.FACE_REVEAL.getOrder()).isEqualTo(8);
    }
    
    @Test
    @DisplayName("getNextStage()가 다음 스테이지를 반환한다")
    void testGetNextStage() {
        assertThat(Stage.WAITING.getNextStage()).isEqualTo(Stage.SELF_INTRO);
        assertThat(Stage.SELF_INTRO.getNextStage()).isEqualTo(Stage.VOTE_FIRST);
        assertThat(Stage.VOTE_FIRST.getNextStage()).isEqualTo(Stage.ROTATION_SHORT);
        assertThat(Stage.ROTATION_SHORT.getNextStage()).isEqualTo(Stage.IMAGE_GAME);
        assertThat(Stage.IMAGE_GAME.getNextStage()).isEqualTo(Stage.ROTATION_LONG);
        assertThat(Stage.ROTATION_LONG.getNextStage()).isEqualTo(Stage.VOTE_FINAL);
        assertThat(Stage.VOTE_FINAL.getNextStage()).isEqualTo(Stage.MATCHING_RESULT);
        assertThat(Stage.MATCHING_RESULT.getNextStage()).isEqualTo(Stage.FACE_REVEAL);
        assertThat(Stage.FACE_REVEAL.getNextStage()).isNull();
    }
    
    @Test
    @DisplayName("getPreviousStage()가 이전 스테이지를 반환한다")
    void testGetPreviousStage() {
        assertThat(Stage.WAITING.getPreviousStage()).isNull();
        assertThat(Stage.SELF_INTRO.getPreviousStage()).isEqualTo(Stage.WAITING);
        assertThat(Stage.VOTE_FIRST.getPreviousStage()).isEqualTo(Stage.SELF_INTRO);
        assertThat(Stage.FACE_REVEAL.getPreviousStage()).isEqualTo(Stage.MATCHING_RESULT);
    }
    
    @Test
    @DisplayName("isVoteStage()가 투표 단계를 올바르게 식별한다")
    void testIsVoteStage() {
        assertThat(Stage.VOTE_FIRST.isVoteStage()).isTrue();
        assertThat(Stage.VOTE_FINAL.isVoteStage()).isTrue();
        
        assertThat(Stage.WAITING.isVoteStage()).isFalse();
        assertThat(Stage.SELF_INTRO.isVoteStage()).isFalse();
        assertThat(Stage.ROTATION_SHORT.isVoteStage()).isFalse();
        assertThat(Stage.IMAGE_GAME.isVoteStage()).isFalse();
    }
    
    @Test
    @DisplayName("isRotationStage()가 로테이션 단계를 올바르게 식별한다")
    void testIsRotationStage() {
        assertThat(Stage.ROTATION_SHORT.isRotationStage()).isTrue();
        assertThat(Stage.ROTATION_LONG.isRotationStage()).isTrue();
        
        assertThat(Stage.WAITING.isRotationStage()).isFalse();
        assertThat(Stage.VOTE_FIRST.isRotationStage()).isFalse();
        assertThat(Stage.IMAGE_GAME.isRotationStage()).isFalse();
    }
    
    @Test
    @DisplayName("isGameStage()가 게임 단계를 올바르게 식별한다")
    void testIsGameStage() {
        assertThat(Stage.IMAGE_GAME.isGameStage()).isTrue();
        
        assertThat(Stage.WAITING.isGameStage()).isFalse();
        assertThat(Stage.VOTE_FIRST.isGameStage()).isFalse();
        assertThat(Stage.ROTATION_SHORT.isGameStage()).isFalse();
    }
    
    @Test
    @DisplayName("isActiveStage()가 활성 단계를 올바르게 식별한다")
    void testIsActiveStage() {
        assertThat(Stage.WAITING.isActiveStage()).isFalse();
        
        assertThat(Stage.SELF_INTRO.isActiveStage()).isTrue();
        assertThat(Stage.VOTE_FIRST.isActiveStage()).isTrue();
        assertThat(Stage.ROTATION_SHORT.isActiveStage()).isTrue();
        assertThat(Stage.FACE_REVEAL.isActiveStage()).isTrue();
    }
    
    @Test
    @DisplayName("각 Stage의 duration이 올바르게 설정되어 있다")
    void testStageDuration() {
        assertThat(Stage.WAITING.getDurationSeconds()).isEqualTo(0);
        assertThat(Stage.SELF_INTRO.getDurationSeconds()).isEqualTo(60);
        assertThat(Stage.VOTE_FIRST.getDurationSeconds()).isEqualTo(30);
        assertThat(Stage.ROTATION_SHORT.getDurationSeconds()).isEqualTo(180);
        assertThat(Stage.IMAGE_GAME.getDurationSeconds()).isEqualTo(120);
        assertThat(Stage.ROTATION_LONG.getDurationSeconds()).isEqualTo(420);
        assertThat(Stage.VOTE_FINAL.getDurationSeconds()).isEqualTo(30);
        assertThat(Stage.MATCHING_RESULT.getDurationSeconds()).isEqualTo(60);
        assertThat(Stage.FACE_REVEAL.getDurationSeconds()).isEqualTo(300);
    }
}
