import React, { useState, useEffect, useMemo } from 'react';
import { useRotationSystem } from '../../hooks/meeting/useRotation';
import { useOpenVidu } from '../../hooks/meeting/useOpenVidu';
import UserVideo from '../../components/meeting/UserVideo';
import type { GameAnswerPayload } from '../../types/meeting/rotaion';

// 이미지 게임용 더미 질문 데이터
const DUMMY_QUESTIONS = [
    "Q1. 무인도에 같이 가고 싶은 사람은?",
    "Q2. 연락을 가장 잘 받아줄 것 같은 사람은?",
    "Q3. 첫눈에 반할 것 같은 스타일은?"
];

// 테스트 유저 데이터
const testUsers = [
    { userId: 101, username: "강병호", gender: 'MALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 102, username: "정승일", gender: 'MALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 201, username: "윤서현", gender: 'FEMALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 202, username: "임유경", gender: 'FEMALE' as const, mode: 'PAIR_ONLY' as const },
];

const RotationTestPage: React.FC = () => {
    const targetRoomId = "001";

    // 1. URL 파라미터로 내 정보 설정
    const [userProfile] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        // user 또는 userId 파라미터를 인덱스로 사용
        const paramVal = params.get('user') || params.get('userId') || '0';
        const userIdx = parseInt(paramVal, 10);
        return testUsers[userIdx] || testUsers[0];
    });

    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

    // 게임/투표 로직 State
    const [gameRound, setGameRound] = useState(0);
    const [hasVoted, setHasVoted] = useState(false);
    const [wsLogs, setWsLogs] = useState<string[]>([]);

    const { state: wsState, submitVote, submitGameAnswer, leaveRoom } = useRotationSystem(activeRoomId || "", userProfile);
    const { publisher, subscribers, joinSession, leaveSession } = useOpenVidu();

    // 로그 출력 헬퍼
    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setWsLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 10));
    };

    // ---------------------------------------------------------
    // [NEW] 백엔드 데이터 확인용 로그 (참가자 목록 변경 시 실행)
    // ---------------------------------------------------------
    useEffect(() => {
        if (wsState.participants.length > 0) {
            // 1. 화면 로그에 알림
            addLog(`📥 참가자 목록 수신: ${wsState.participants.length}명`);

            // 2. 브라우저 콘솔에 상세 데이터 출력 (F12 확인용)
            console.group('👥 [Backend Data] 참가자 목록 업데이트');
            console.table(wsState.participants); // 표 형태로 깔끔하게 출력
            console.log('Raw Data:', JSON.stringify(wsState.participants, null, 2)); // 복사하기 좋은 형태
            console.groupEnd();
        }
    }, [wsState.participants]);

    // ---------------------------------------------------------
    // 후보군 필터링 (나를 제외한 '이성'만 추출)
    // ---------------------------------------------------------
    const candidates = useMemo(() => {
        return wsState.participants.filter(p => {
            if (p.userId === userProfile.userId) return false;
            if (!p.gender) return false; // 성별 없으면 제외

            const myGender = String(userProfile.gender).toUpperCase();
            const targetGender = String(p.gender).toUpperCase();

            // 성별 비교 로그 (필터링 동작 확인용)
            // console.log(`비교: 나(${myGender}) vs 상대(${p.nickname}/${targetGender}) -> ${myGender !== targetGender ? '포함' : '제외'}`);

            return myGender !== targetGender;
        });
    }, [wsState.participants, userProfile]);

    // ---------------------------------------------------------
    // 스테이지 변경 시 상태 초기화
    // ---------------------------------------------------------
    useEffect(() => {
        setHasVoted(false);
        setGameRound(0);
    }, [wsState.currentStage]);

    // ---------------------------------------------------------
    // 세션 자동 접속
    // ---------------------------------------------------------
    useEffect(() => {
        const partnerInfo = wsState.currentPartner;
        if (partnerInfo?.sessionId && partnerInfo?.token) {
            joinSession(partnerInfo.sessionId, partnerInfo.token, userProfile.username);
        }
    }, [wsState.currentPartner?.sessionId, wsState.currentPartner?.token, joinSession, userProfile.username]);

    // ---------------------------------------------------------
    // 선택 핸들러
    // ---------------------------------------------------------
    const handleChoice = (targetId: number, isAutoRandom = false) => {
        if (hasVoted && !isAutoRandom && wsState.currentStage !== 'IMAGE_GAME') return;

        const targetUser = candidates.find(c => c.userId === targetId);
        const targetName = targetUser?.nickname || `User(${targetId})`;
        const logPrefix = isAutoRandom ? '[자동선택]' : '[선택]';

        if (wsState.currentStage === 'VOTE_FIRST' || wsState.currentStage === 'VOTE_FINAL') {
            submitVote(targetId);
            addLog(`📤 ${logPrefix} 투표 전송: ${targetName}`);
            setHasVoted(true);
        }
        else if (wsState.currentStage === 'IMAGE_GAME') {
            const payload: GameAnswerPayload = {
                questionIndex: gameRound,
                targetUserId: targetId
            };
            submitGameAnswer(JSON.stringify(payload));
            addLog(`📤 ${logPrefix} 게임(Q${gameRound + 1}) 전송: ${targetName}`);

            if (gameRound < 2) {
                setGameRound(prev => prev + 1);
            } else {
                setHasVoted(true);
                addLog(`✅ 이미지 게임 완료`);
            }
        }
    };

    // ---------------------------------------------------------
    // 타임아웃 방지
    // ---------------------------------------------------------
    useEffect(() => {
        const isSelectionStage = ['VOTE_FIRST', 'VOTE_FINAL', 'IMAGE_GAME'].includes(wsState.currentStage);
        if (isSelectionStage && wsState.remainingTime <= 1 && !hasVoted && candidates.length > 0) {
            console.warn("⏳ 시간 초과! 랜덤 선택 수행");
            const randomIndex = Math.floor(Math.random() * candidates.length);
            handleChoice(candidates[randomIndex].userId, true);
        }
    }, [wsState.remainingTime, hasVoted, candidates, wsState.currentStage]);

    // 방 입장 핸들러
    const handleEnterRoom = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await fetch(`${API_URL}/test/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: targetRoomId,
                    mode: 'PAIR_ONLY',
                    maxParticipants: 4,
                    roundDuration: 60
                }),
            });
            if (response.ok) addLog('방 생성/접속 성공');
            else console.log('방 접속 시도...');
            setActiveRoomId(targetRoomId);
        } catch (error) {
            console.error(error);
            alert('서버 연결 실패');
        }
    };

    // ---------------------------------------------------------
    // [NEW] 자기소개 단계 자동 마이크 제어
    // ---------------------------------------------------------
    useEffect(() => {
        if (!publisher) return;

        if (wsState.currentStage === 'SELF_INTRO') {
            const speakerId = wsState.currentSpeaker?.id;
            const isMyTurn = speakerId === userProfile.userId;

            if (isMyTurn) {
                console.log('🎤 내 차례! 마이크 ON');
                publisher.publishAudio(true);
            } else {
                console.log('🤫 경청 모드. 마이크 OFF');
                publisher.publishAudio(false);
            }
        } else {
            // 다른 단계에서는 기본적으로 마이크 켜기 (또는 사용자 설정 따름)
            // 여기서는 편의상 다시 켜주는 것으로 설정
            // publisher.publishAudio(true); 
            // 주의: VOTE 단계 등에서도 계속 대화가 가능하다면 켜두는 게 맞음.
            // 필요 시 조건 세분화. 일단은 SELF_INTRO 끝났을 때 복구 로직이 필요할 수 있음.
            if (activeRoomId) { // 방에 입장한 상태라면
                publisher.publishAudio(true);
            }
        }
    }, [wsState.currentStage, wsState.currentSpeaker?.id, publisher, userProfile.userId, activeRoomId]);

    // ---------------------------------------------------------
    // 화면 렌더링
    // ---------------------------------------------------------
    const renderMainContent = () => {
        const stage = wsState.currentStage;
        const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', width: '100%' };

        const renderSelectionScreen = (title: string, subTitle: string) => (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <h2 style={{ fontSize: '2em', marginBottom: '10px' }}>{title}</h2>
                <p style={{ fontSize: '1.2em', color: '#666', marginBottom: '30px', fontWeight: 'bold' }}>{subTitle}</p>

                {hasVoted ? (
                    <div style={{ padding: '40px', background: '#e3f2fd', borderRadius: '16px', textAlign: 'center' }}>
                        <h3>✅ 선택 완료!</h3>
                        <p>다른 참가자를 기다리고 있습니다...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {candidates.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#d9534f' }}>
                                <p>⚠️ 선택 가능한 이성 참가자가 없습니다.</p>
                                <small>(콘솔 로그를 확인하여 데이터 수신 여부를 체크하세요)</small>
                            </div>
                        ) : (
                            candidates.map(p => (
                                <button
                                    key={p.userId}
                                    onClick={() => handleChoice(p.userId)}
                                    style={{
                                        width: '130px', height: '130px', borderRadius: '50%',
                                        border: '4px solid #fff',
                                        background: p.gender === 'MALE' ? '#42a5f5' : '#ff7e5f',
                                        color: 'white', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                                        boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
                                        transition: 'transform 0.2s',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1.0)'}
                                >
                                    <span>{p.nickname}</span>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        );

        // 자기소개 UI 렌더링 함수
        const renderSelfIntroScreen = () => {
            const speaker = wsState.currentSpeaker;
            const isMyTurn = speaker?.id === userProfile.userId;

            console.log("====================");
            console.log('speaker: ', speaker);
            console.log('isMyTurn:', isMyTurn);
            console.log("====================");

            return (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        textAlign: 'center', padding: '20px', marginBottom: '20px',
                        background: isMyTurn ? '#fff3e0' : '#f3e5f5',
                        borderRadius: '12px', border: isMyTurn ? '2px solid #ff9800' : '1px solid #ddd'
                    }}>
                        <h2 style={{ fontSize: '2em', margin: '0 0 10px 0' }}>
                            {isMyTurn ? '🎤 당신 차례입니다!' : `🤫 ${speaker?.speakerNickname || '누군가'}님의 소개를 들어주세요`}
                        </h2>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#d9534f' }}>
                            남은 시간: {wsState.remainingTime}초
                        </div>
                    </div>

                    <div style={gridStyle}>
                        {/* 내 비디오 (발언자일 때 강조) */}
                        <div style={{
                            border: isMyTurn ? '5px solid #ff9800' : '2px solid transparent',
                            borderRadius: '8px', overflow: 'hidden', position: 'relative'
                        }}>
                            {publisher && <UserVideo streamManager={publisher} isLocal={true} />}
                            {isMyTurn && <span style={{ position: 'absolute', top: 10, left: 10, background: '#ff9800', color: 'white', padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold' }}>ME</span>}
                        </div>

                        {/* 다른 참가자 비디오 (발언자일 때 강조) */}
                        {subscribers.map(sub => {
                            const isSpeaker = sub.stream.connection.data.includes(`"clientData":"${speaker?.speakerNickname}"`); // OpenVidu 데이터 포맷에 따라 조정 필요
                            // 혹은 userId를 clientData에 넣었다면 그것으로 비교. 현재 닉네임 비교는 부정확할 수 있으나 UI용으로 시도.
                            // 더 정확하게는 stream.connection.data를 파싱해야 함. 여기서는 심플하게 테두리 효과만 주는 로직을 구현하기 어려우므로(sub 객체에 userId 정보 매핑 필요) 
                            // 우선 전체 리스트를 보여주되, 상단 헤더로 발언자를 인지시킴.
                            return <UserVideo key={sub.stream.streamId} streamManager={sub} isLocal={false} />;
                        })}
                    </div>
                </div>
            );
        };

        switch (stage) {
            case 'WAITING':
                return (
                    <div style={gridStyle}>
                        {publisher && <div style={{ border: '2px solid gold' }}><UserVideo streamManager={publisher} isLocal={true} /></div>}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#fff', borderRadius: '8px' }}>
                            <h3>⏳ 대기 중 ({wsState.participants.length}/4)</h3>
                        </div>
                    </div>
                );
            case 'SELF_INTRO': return renderSelfIntroScreen();
            case 'VOTE_FIRST': return renderSelectionScreen('🗳️ 첫인상 투표', '첫인상이 좋은 이성을 선택하세요.');
            case 'IMAGE_GAME': return renderSelectionScreen('🎨 이미지 게임', `[${gameRound + 1}/3] ${DUMMY_QUESTIONS[gameRound]}`);
            case 'VOTE_FINAL': return renderSelectionScreen('💘 최종 투표', '최종 커플이 되고 싶은 이성을 선택하세요.');
            case 'MATCHING_RESULT':
                return (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <h1>결과 발표</h1>
                        <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{wsState.lastMessage}</p>
                    </div>
                );
            default:
                return (
                    <div style={gridStyle}>
                        {publisher && <UserVideo streamManager={publisher} isLocal={true} />}
                        {subscribers.map(sub => <UserVideo key={sub.stream.streamId} streamManager={sub} isLocal={false} />)}
                    </div>
                );
        }
    };

    if (!activeRoomId) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8f9fa' }}>
                <div style={{ padding: '40px', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
                    <h1>💘 Roundy Meeting</h1>
                    <p>User: <strong>{userProfile.username}</strong> ({userProfile.gender})</p>
                    <button onClick={handleEnterRoom} style={{ padding: '15px 30px', background: '#ff4081', color: 'white', border: 'none', borderRadius: '50px', fontSize: '18px', cursor: 'pointer' }}>
                        참여하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                <div>
                    <h2>🎥 Rotation System Test</h2>
                    <span>User: <strong>{userProfile.username}</strong> ({userProfile.gender})</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d9534f' }}>
                        {wsState.currentStage} ({wsState.remainingTime}s)
                    </div>
                    <small>{wsState.connected ? '🟢 연결됨' : '🔴 끊김'}</small>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* 메인 화면 */}
                <div style={{ flex: 3, background: '#f0f0f0', padding: '20px', borderRadius: '12px', minHeight: '500px' }}>
                    {renderMainContent()}
                </div>

                {/* 사이드바 */}
                <div style={{ flex: 1, background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
                    <h4>참가자 ({wsState.participants.length})</h4>
                    <ul>
                        {wsState.participants.map(p => (
                            <li key={p.userId} style={{ color: p.userId === userProfile.userId ? 'blue' : 'black' }}>
                                {p.nickname} <span style={{ fontSize: '0.8em', color: '#888' }}>({p.gender})</span>
                            </li>
                        ))}
                    </ul>
                    <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #eee' }} />

                    <h4>📡 Logs</h4>
                    <div style={{ flex: 1, maxHeight: '250px', overflowY: 'auto', background: '#222', color: '#0f0', padding: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
                        {wsLogs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>

                    <button onClick={leaveRoom} style={{ marginTop: '10px', padding: '10px', width: '100%' }}>나가기</button>
                </div>
            </div>
        </div>
    );
};

export default RotationTestPage;