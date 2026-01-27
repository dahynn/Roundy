-- Preference 초기 데이터

-- 선호관계 (RELATIONSHIP_GOAL)
INSERT INTO preferences (type, content) VALUES
    ('RELATIONSHIP_GOAL', '결혼 의향도 있어요'),
    ('RELATIONSHIP_GOAL', '진지한 연애'),
    ('RELATIONSHIP_GOAL', '일단 연애부터'),
    ('RELATIONSHIP_GOAL', '일단 친구부터'),
    ('RELATIONSHIP_GOAL', '아직 모르겠어요');

-- 연애 스타일 (DATING_STYLE)
INSERT INTO preferences (type, content) VALUES
    ('DATING_STYLE', '다정한 스킨십'),
    ('DATING_STYLE', '상대한테 맞춰줘요'),
    ('DATING_STYLE', '깜짝 선물'),
    ('DATING_STYLE', '응원과 격려'),
    ('DATING_STYLE', '함께 시간 보내기'),
    ('DATING_STYLE', '꾸준한 연락'),
    ('DATING_STYLE', '취미/관심사 공유'),
    ('DATING_STYLE', '소소한 이벤트'),
    ('DATING_STYLE', '표현을 잘해요'),
    ('DATING_STYLE', '꼼꼼한 데이트 계획'),
    ('DATING_STYLE', '한 사람만 봐요');

-- 선호 데이트 (DATE_PREFERENCE)
INSERT INTO preferences (type, content) VALUES
    ('DATE_PREFERENCE', '집에서 놀기'),
    ('DATE_PREFERENCE', '근교 드라이브하기'),
    ('DATE_PREFERENCE', '요리해먹기'),
    ('DATE_PREFERENCE', '맛집 투어하기'),
    ('DATE_PREFERENCE', '쇼핑하기'),
    ('DATE_PREFERENCE', '카페 투어하기'),
    ('DATE_PREFERENCE', '같이 술 마시기'),
    ('DATE_PREFERENCE', '노래방 가기'),
    ('DATE_PREFERENCE', '놀이공원 가기'),
    ('DATE_PREFERENCE', '동네 구경하기'),
    ('DATE_PREFERENCE', '산책하기'),
    ('DATE_PREFERENCE', '영화 보러가기'),
    ('DATE_PREFERENCE', '전시회 보러가기'),
    ('DATE_PREFERENCE', '같이 운동하기'),
    ('DATE_PREFERENCE', '같이 게임하기'),
    ('DATE_PREFERENCE', '공연/콘서트 관람하기'),
    ('DATE_PREFERENCE', '스포츠 관람하기'),
    ('DATE_PREFERENCE', '여행가기');

-- 성격 (PERSONALITY)
INSERT INTO preferences (type, content) VALUES
    ('PERSONALITY', '웃음이 많아요'),
    ('PERSONALITY', '예의가 발라요'),
    ('PERSONALITY', '긍정적인 마인드'),
    ('PERSONALITY', '솔직해요'),
    ('PERSONALITY', '다정해요'),
    ('PERSONALITY', '배려심이 깊어요'),
    ('PERSONALITY', '동물을 좋아해요'),
    ('PERSONALITY', '털털해요'),
    ('PERSONALITY', '장난기가 많아요'),
    ('PERSONALITY', '애교가 많아요'),
    ('PERSONALITY', '허세 없어요'),
    ('PERSONALITY', '유머 감각이 있어요'),
    ('PERSONALITY', '섬세해요'),
    ('PERSONALITY', '수줍어요'),
    ('PERSONALITY', '낙천적이에요'),
    ('PERSONALITY', '활발해요'),
    ('PERSONALITY', '감성적이에요'),
    ('PERSONALITY', '친절해요'),
    ('PERSONALITY', '엉뚱해요'),
    ('PERSONALITY', '성실해요'),
    ('PERSONALITY', '리드하는 편'),
    ('PERSONALITY', '조용해요'),
    ('PERSONALITY', '직진해요');

-- 외모 (APPEARANCE)
INSERT INTO preferences (type, content) VALUES
    ('APPEARANCE', '강아지상'),
    ('APPEARANCE', '고양이상'),
    ('APPEARANCE', '눈웃음'),
    ('APPEARANCE', '동안이에요'),
    ('APPEARANCE', '큰 눈'),
    ('APPEARANCE', '손이 예뻐요'),
    ('APPEARANCE', '깨끗한 피부'),
    ('APPEARANCE', '하얀 피부'),
    ('APPEARANCE', '구릿빛 피부'),
    ('APPEARANCE', '비율이 좋아요'),
    ('APPEARANCE', '보조개'),
    ('APPEARANCE', '다리가 예뻐요'),
    ('APPEARANCE', '쌍커풀 없는 눈'),
    ('APPEARANCE', '오똑한 콧날'),
    ('APPEARANCE', '힙업'),
    ('APPEARANCE', '짙은 눈썹'),
    ('APPEARANCE', '실물파');

-- 재능 (TALENT)
INSERT INTO preferences (type, content) VALUES
    ('TALENT', '이야기를 잘 들어줘요'),
    ('TALENT', '대화를 잘 이끌어요'),
    ('TALENT', '뭐든 잘 먹어요'),
    ('TALENT', '혼자 잘 놀아요'),
    ('TALENT', '요리를 잘해요'),
    ('TALENT', '패션 센스가 좋아요'),
    ('TALENT', '운동을 좋아해요'),
    ('TALENT', '목소리가 좋아요'),
    ('TALENT', '체력이 좋아요'),
    ('TALENT', '노래를 잘해요'),
    ('TALENT', '섹시한 두뇌'),
    ('TALENT', '시사에 밝아요'),
    ('TALENT', '게임을 잘해요'),
    ('TALENT', '높은 경제력'),
    ('TALENT', '고소득자'),
    ('TALENT', '운전 잘해요'),
    ('TALENT', '집안일 잘해요'),
    ('TALENT', '적극적인 플러팅');
