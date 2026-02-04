package com.ssafya701.roundy.webrtc.room.enums;

import lombok.Getter;

/**
 * 로테이션 소개팅의 8단계 스테이지 정의
 * 각 단계별 진행 시간과 순서를 관리
 */
@Getter
public enum Stage {
    /**
     * 대기 단계 - 참가자들이 모이는 시간
     */
    WAITING(0, 0),
    
    /**
     * 자기소개 - 한 명씩 발언권을 가지고 소개 (5초, 테스트용)
     */
    SELF_INTRO(5, 1),
    
    /**
     * 첫인상 투표 - 첫 느낌으로 마음에 드는 사람 선택 (10초, 테스트용)
     */
    VOTE_FIRST(10, 2),
    
    /**
     * 짧은 1:1 대화 - 랜덤 페어링 대화 (20초, 테스트용)
     */
    ROTATION_SHORT(20, 3),
    
    /**
     * 이미지 게임 - 아이스브레이킹 게임 (35초, 테스트용)
     */
    IMAGE_GAME(35, 4),
    
    /**
     * 긴 1:1 대화 - 랜덤 페어링 대화 (30초, 테스트용)
     */
    ROTATION_LONG(30, 5),
    
    /**
     * 최종 투표 - 대화 후 최종 선택 (10초, 테스트용)
     */
    VOTE_FINAL(10, 6),
    
    /**
     * 매칭 결과 발표 - 쌍방 매칭 확인 및 결과 공개 (10초, 테스트용)
     */
    MATCHING_RESULT(10, 7),
    
    /**
     * 얼굴 공개 - 매칭 성공 시 얼굴 공개 단계 (15초, 테스트용)
     */
    FACE_REVEAL(15, 8);
    
    /**
     * 스테이지 기본 진행 시간 (초)
     */
    private final int durationSeconds;
    
    /**
     * 스테이지 순서 (0: WAITING, 1~8: 실제 진행 단계)
     */
    private final int order;
    
    Stage(int durationSeconds, int order) {
        this.durationSeconds = durationSeconds;
        this.order = order;
    }
    
    /**
     * 다음 스테이지 반환
     * @return 다음 스테이지, 마지막 단계인 경우 null
     */
    public Stage getNextStage() {
        for (Stage stage : values()) {
            if (stage.order == this.order + 1) {
                return stage;
            }
        }
        return null; // FACE_REVEAL 이후에는 null
    }
    
    /**
     * 이전 스테이지 반환
     * @return 이전 스테이지, 첫 단계인 경우 null
     */
    public Stage getPreviousStage() {
        for (Stage stage : values()) {
            if (stage.order == this.order - 1) {
                return stage;
            }
        }
        return null; // WAITING 이전에는 null
    }
    
    /**
     * 투표 단계인지 확인
     * @return 첫인상 투표 또는 최종 투표인 경우 true
     */
    public boolean isVoteStage() {
        return this == VOTE_FIRST || this == VOTE_FINAL;
    }
    
    /**
     * 로테이션(1:1 대화) 단계인지 확인
     * @return 짧은 대화 또는 긴 대화인 경우 true
     */
    public boolean isRotationStage() {
        return this == ROTATION_SHORT || this == ROTATION_LONG;
    }
    
    /**
     * 게임 단계인지 확인
     * @return 이미지 게임인 경우 true
     */
    public boolean isGameStage() {
        return this == IMAGE_GAME;
    }
    
    /**
     * 실제 진행 중인 단계인지 확인 (WAITING 제외)
     * @return WAITING이 아닌 경우 true
     */
    public boolean isActiveStage() {
        return this != WAITING;
    }
}
