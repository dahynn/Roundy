package com.ssafya701.roundy.webrtc.game;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 이미지 게임 문제 저장소
 * 
 * TODO: [DB 확장] 추후 DB에서 조회하도록 변경
 * - game_questions 테이블 생성
 * - JPA Repository로 변경
 * - 관리자 페이지에서 문제 CRUD 가능하도록 구현
 */
@Component
public class GameQuestionRepository {
    
    /**
     * 하드코딩된 게임 문제 리스트
     * TODO: [DB 확장] DB 테이블로 이전
     */
    private static final List<GameQuestion> QUESTIONS = Arrays.asList(
        new GameQuestion(1, "여기에서 제일 인기 많을 것 같은 사람", "인기왕"),
        new GameQuestion(2, "여기에서 제일 웃긴 사람", "개그맨"),
        new GameQuestion(3, "여기에서 제일 센스있는 사람", "센스왕"),
        new GameQuestion(4, "여기에서 제일 매력적인 사람", "매력왕"),
        new GameQuestion(5, "여기에서 제일 친해지고 싶은 사람", "인싸")
    );
    
    /**
     * 모든 문제 조회
     * 
     * @return 고정된 5개 문제 리스트
     */
    public List<GameQuestion> getAllQuestions() {
        return new ArrayList<>(QUESTIONS);
    }
    
    /**
     * 특정 문제 조회
     * 
     * @param number 문제 번호 (1~5)
     * @return 해당 문제, 없으면 null
     */
    public GameQuestion getQuestion(int number) {
        return QUESTIONS.stream()
            .filter(q -> q.getQuestionNumber() == number)
            .findFirst()
            .orElse(null);
    }
    
    /**
     * 총 문제 개수
     * 
     * @return 5
     */
    public int getTotalQuestionCount() {
        return QUESTIONS.size();
    }
}
