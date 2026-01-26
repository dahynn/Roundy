package com.ssafya701.roundy.Entity;

import com.ssafya701.roundy.Enums.PreferenceType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "preferences")
public class Preference {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PreferenceType type; // RELATIONSHIP, STYLE, DATE

    @Column(nullable = false)
    private String content;

    public Preference(PreferenceType type, String content) {
        this.type = type;
        this.content = content;
    }
}
