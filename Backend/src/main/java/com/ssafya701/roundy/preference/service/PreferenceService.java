package com.ssafya701.roundy.preference.service;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import com.ssafya701.roundy.preference.dto.response.PreferenceResponse;
import com.ssafya701.roundy.preference.dto.response.UserPreferenceResponse;
import com.ssafya701.roundy.preference.entity.Preference;
import com.ssafya701.roundy.preference.enums.PreferenceType;
import com.ssafya701.roundy.preference.repository.PreferenceRepository;
import com.ssafya701.roundy.user.entity.UserPreference;
import com.ssafya701.roundy.user.repository.UserPreferenceRepository;
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
}
