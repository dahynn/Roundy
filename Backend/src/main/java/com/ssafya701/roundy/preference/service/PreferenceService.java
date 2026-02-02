package com.ssafya701.roundy.preference.service;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import com.ssafya701.roundy.preference.dto.response.PreferenceResponse;
import com.ssafya701.roundy.preference.dto.response.UserPreferenceResponse;
import com.ssafya701.roundy.preference.entity.Preference;
import com.ssafya701.roundy.preference.enums.PreferenceType;
import com.ssafya701.roundy.preference.repository.PreferenceRepository;
import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.entity.UserPreference;
import com.ssafya701.roundy.auth.repository.UserPreferenceRepository;
import com.ssafya701.roundy.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PreferenceService {

    private final PreferenceRepository preferenceRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final UserRepository userRepository;

    // 온보딩 화면에서 표시될 전체 preference 조회
    public List<PreferenceResponse> getAllPreferences() {
        return preferenceRepository.findAll()
                .stream()
                .map(PreferenceResponse::from)
                .collect(Collectors.toList());
    }

    // 유저별 preference 조회
    public UserPreferenceResponse getUserPreferences(Long userId) {
        List<UserPreference> userPreferences = userPreferenceRepository.findByUserId(userId);

        Map<PreferenceType, List<String>> groupedPreferences = userPreferences.stream()
                .collect(Collectors.groupingBy(
                        up -> up.getPreference().getType(),
                        Collectors.mapping(
                                up -> up.getPreference().getContent(),
                                Collectors.toList())));

        return new UserPreferenceResponse(groupedPreferences);
    }

    // Preference ID 유효성 검증
    public List<Preference> validateAndGetPreferences(List<Long> preferenceIds) {
        List<Preference> preferences = preferenceRepository.findAllById(preferenceIds);

        if (preferences.size() != preferenceIds.size()) {
            throw new CustomException(ErrorEnum.INVALID_INPUT);
        }

        return preferences;
    }

    // 선호도 수정 (토큰 재발급 없음)
    @Transactional
    public void updateUserPreferences(Long userId, List<Long> preferenceIds) {
        // User 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));

        // Preference 유효성 검증 및 조회
        List<Preference> preferences = preferenceRepository.findAllById(preferenceIds);
        if (preferences.size() != preferenceIds.size()) {
            throw new CustomException(ErrorEnum.INVALID_INPUT);
        }

        // 타입별 개수 검증
        validatePreferenceCount(preferences, "RELATIONSHIP_GOAL", 2);
        validatePreferenceCount(preferences, "DATING_STYLE", 2);
        validatePreferenceCount(preferences, "DATE_PREFERENCE", 3);
        validatePreferenceCount(preferences, "PERSONALITY", 2);
        validatePreferenceCount(preferences, "APPEARANCE", 3);
        validatePreferenceCount(preferences, "TALENT", 2);

        // 기존 UserPreference 삭제
        userPreferenceRepository.deleteByUserId(userId);

        // 새로운 UserPreference 저장
        List<UserPreference> userPreferences = preferences.stream()
                .map(preference -> UserPreference.builder()
                        .user(user)
                        .preference(preference)
                        .build())
                .toList();

        userPreferenceRepository.saveAll(userPreferences);
    }

    // 특정 타입의 Preference 개수 검증
    private void validatePreferenceCount(List<Preference> preferences, String type, int expectedCount) {
        long count = preferences.stream()
                .filter(p -> p.getType().name().equals(type))
                .count();

        if (count != expectedCount) {
            String errorMessage = String.format("%s 항목은 %d개를 선택해야 합니다. (현재: %d개)",
                    convertToKorean(PreferenceType.valueOf(type)), expectedCount, count);
            throw new CustomException(ErrorEnum.INVALID_PREFERENCE_COUNT, errorMessage);
        }
    }

    private String convertToKorean(PreferenceType type) {
        return switch (type) {
            case RELATIONSHIP_GOAL -> "연애 목표";
            case DATING_STYLE -> "데이트 스타일";
            case DATE_PREFERENCE -> "선호 데이트";
            case PERSONALITY -> "성격";
            case APPEARANCE -> "외모";
            case TALENT -> "재능/특기";
        };
    }
}
