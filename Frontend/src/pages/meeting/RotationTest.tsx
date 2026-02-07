
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRotationSystem } from '../../hooks/meeting/useRotation';
import { useOpenVidu } from '../../hooks/meeting/useOpenVidu';
import UserVideo from '../../components/meeting/UserVideo';
import { useMagicMirror } from '../../hooks/meeting/useMagicMirror'; // [ADD]
import type { GameAnswerPayload } from '../../types/meeting/rotaion';

// 이미지 게임용 더미 질문 데이터
const DUMMY_QUESTIONS = [
    "상대방과 함께 가고 싶은 여행지는?",
    "가장 좋아하는 음식 종류는?",
    "주말에 주로 하는 취미는?"
];

// 테스트 유저 데이터
const testUsers = [
    { userId: 101, username: "강병호", gender: 'MALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 102, username: "정승일", gender: 'MALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 201, username: "윤서현", gender: 'FEMALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 202, username: "임유경", gender: 'FEMALE' as const, mode: 'PAIR_ONLY' as const },
];

const RotationTest: React.FC = () => {
    // 1. URL 파라미터로 내 정보 설정 (Vanilla Logic)
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

    const { state: wsState, submitVote, submitGameAnswer, leaveRoom } = useRotationSystem(activeRoomId || "", "", userProfile);
    const { session, publisher, subscribers, joinSession, leaveSession, initSelfCamera } = useOpenVidu();

    // [ADD] AI Magic Mirror Hook - isStreamReady 추가!
    const { canvasRef, maskedStream, isStreamReady, setMode, isLoaded: isAiLoaded } = useMagicMirror();

    // ---------------------------------------------------------
    // [NEW ARCHITECTURE] AI-First Publisher
    // 1. maskedStream 준비 대기 (isStreamReady)
    // 2. AI 트랙으로 바로 Publisher 생성
    // 3. replaceTrack 불필요!
    // ---------------------------------------------------------

    // 1. AI 스트림 준비 후 Publisher 생성
    useEffect(() => {
        if (!isStreamReady || !maskedStream) {
            console.log('⏳ [RotationTest] AI 스트림 준비 대기 중...', { isStreamReady, hasMaskedStream: !!maskedStream });
            return;
        }

        // 2. MediaStream 활성 상태 검증
        if (!maskedStream.active) {
            console.warn('⚠️ [RotationTest] maskedStream is not active');
            return;
        }

        const videoTrack = maskedStream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState !== 'live') {
            console.warn('⚠️ [RotationTest] videoTrack is not live');
            return;
        }

        // 3. Publisher 생성 (AI 트랙으로)
        console.log('🎭 [RotationTest] AI 스트림 준비 완료! Publisher 생성 시작...');
        initSelfCamera(videoTrack, true) // forceNew: true로 새로 생성
            .then(() => console.log('✅ [RotationTest] Publisher created with AI track'))
            .catch(err => console.error('❌ [RotationTest] Publisher creation failed:', err));

    }, [isStreamReady, maskedStream, initSelfCamera]);

    // replaceTrack useEffect 완전 제거!

    // [ADD] Stage에 따른 마스킹 모드 설정
    useEffect(() => {
        const stage = wsState.currentStage;
        switch (stage) {
            case 'WAITING':
                setMode('BLACK'); // 대기 중엔 검은 화면
                break;
            case 'SELF_INTRO':
            case 'ROTATION_SHORT': // 실루엣
                setMode('SILHOUETTE');
                break;
            case 'ROTATION_LONG': // 코 마스크
                setMode('NOSE_MASK');
                break;
            case 'FACE_REVEAL': // 얼굴 공개
                setMode('NORMAL');
                break;
            case 'IMAGE_GAME':
            case 'VOTE_FIRST':
            case 'VOTE_FINAL':
                setMode('BLACK');
                break;
            default:
                setMode('BLACK');
                break;
        }
    }, [wsState.currentStage, setMode]);

    // 로그 출력 헬퍼
    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setWsLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 10));
    };

    // ---------------------------------------------------------
    // 후보군 필터링 (나를 제외한 '이성'만 추출)
    // ---------------------------------------------------------
    const candidates = useMemo(() => {
        return wsState.participants.filter(p => {
            if (p.userId === userProfile.userId) return false;
            if (!p.gender) return false;

            const myGender = String(userProfile.gender).toUpperCase();
            const targetGender = String(p.gender).toUpperCase();

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
            // 🆕 세션 전환 시 maskedStream의 트랙을 전달하여 트랙 검증에 활용
            const videoTrack = maskedStream?.getVideoTracks()[0];

            // 🔍 디버깅: maskedStream 상태 확인
            console.log('🔍 [RotationTest] 세션 접속 전 maskedStream 상태:', {
                hasMaskedStream: !!maskedStream,
                isActive: maskedStream?.active,
                hasVideoTrack: !!videoTrack,
                trackState: videoTrack?.readyState
            });

            joinSession(partnerInfo.sessionId, partnerInfo.token, userProfile.username, videoTrack);
        }
    }, [wsState.currentPartner?.sessionId, wsState.currentPartner?.token, joinSession, userProfile.username, maskedStream]);

    // ---------------------------------------------------------
    // 컴포넌트 언마운트 시 정리
    // ---------------------------------------------------------
    useEffect(() => {
        // [FIX] initSelfCamera() 제거 - AI 스트림 준비 후 위의 useEffect에서 호출됨
        return () => {
            leaveSession();
            leaveRoom();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ---------------------------------------------------------
    // 선택 핸들러
    // ---------------------------------------------------------
    const handleChoice = (targetId: number, isAutoRandom = false) => {
        if (hasVoted && !isAutoRandom && wsState.currentStage !== 'IMAGE_GAME') return;

        const targetUser = candidates.find(c => c.userId === targetId);
        const targetName = targetUser?.nickname || `User(${targetId})`;
        const logPrefix = isAutoRandom ? '[자동선택]' : '[선택]';

        if (wsState.currentStage === 'VOTE_FIRST' || wsState.currentStage === 'VOTE_FINAL') {
            submitVote(targetId); // useRotation.ts가 any payload를 받으므로 number도 OK (서버가 처리)
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
            const targetRoomId = "001"; // Default room ID
            // [FIX] 백엔드 API 경로 수정: VITE_API_URL에 이미 /api가 포함되어 있으므로 중복 제거
            const response = await fetch(
                `${API_URL}/test/room/create?roomId=${targetRoomId}&mode=PAIR_ONLY`,
                { method: 'GET' }
            );
            if (response.ok) addLog('방 생성/접속 성공');
            else console.log('방 접속 시도...');
            setActiveRoomId(targetRoomId);
        } catch (error) {
            console.error(error);
            alert('서버 연결 실패');
        }
    };

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
                        {/* 내 비디오 */}
                        <div style={{
                            border: isMyTurn ? '5px solid #ff9800' : '2px solid transparent',
                            borderRadius: '8px', overflow: 'hidden', position: 'relative'
                        }}>
                            {publisher && <UserVideo streamManager={publisher} isLocal={true} />}
                            {isMyTurn && <span style={{ position: 'absolute', top: 10, left: 10, background: '#ff9800', color: 'white', padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold' }}>ME</span>}
                        </div>

                        {/* 다른 참가자 비디오 */}
                        {subscribers.map(sub => {
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

    // [FIX] Canvas 지속성 유지: 조건부 렌더링 밖으로 이동
    // 이렇게 해야 방 입장 시 Canvas가 언마운트되지 않고 스트림이 유지됨
    const hiddenCanvas = (
        <canvas
            ref={canvasRef}
            width="640"
            height="480"
            style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        />
    );

    // [FIX] 렌더링 구조 최적화: Canvas는 항상 최상위에 유지 (Unmount 방지)
    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* 1. Magic Mirror Canvas (절대 숨김 & 유지) */}
            {hiddenCanvas}

            {/* 2. 조건부 컨텐츠 렌더링 */}
            {!activeRoomId ? (
                // 대기 화면 (로그인)
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ padding: '40px', background: 'white', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#333' }}>💘 Roundy Meeting</h1>
                        <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>User: <strong>{userProfile.username}</strong> ({userProfile.gender})</p>
                        <p style={{ fontSize: '14px', color: isAiLoaded ? '#10b981' : '#f59e0b', marginBottom: '15px', fontWeight: 'bold' }}>
                            {isAiLoaded ? '✅ AI 모델 로드 완료' : '⏳ AI 모델 로딩 중...'}
                        </p>
                        <button
                            onClick={handleEnterRoom}
                            disabled={!isAiLoaded}
                            style={{
                                padding: '15px 40px',
                                background: isAiLoaded ? '#ff4081' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50px',
                                fontSize: '18px',
                                cursor: isAiLoaded ? 'pointer' : 'not-allowed',
                                transition: 'transform 0.1s'
                            }}
                        >
                            {isAiLoaded ? '참여하기' : '로딩 중...'}
                        </button>
                    </div>
                </div>
            ) : (
                // 메인 룸 화면
                <>
                    <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                        <div>
                            <h2>🎥 Rotation System Test (AI Enabled)</h2>
                            <span>User: <strong>{userProfile.username}</strong> ({userProfile.gender})</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d9534f' }}>
                                {wsState.currentStage} ({wsState.remainingTime}s)
                            </div>
                            <small>{wsState.connected ? '🟢 연결됨' : '🔴 끊김'}</small>
                        </div>
                    </header>

                    <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                        {/* 메인 화면 */}
                        <div style={{ flex: 3, background: '#f0f0f0', padding: '20px', borderRadius: '12px', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
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
                            <div style={{ flex: 1, maxHeight: '250px', overflowY: 'auto', background: '#222', color: '#0f0', padding: '10px', fontSize: '12px', fontFamily: 'monospace', borderRadius: '4px' }}>
                                {wsLogs.map((log, i) => <div key={i}>{log}</div>)}
                            </div>

                            <button onClick={leaveRoom} style={{ marginTop: '10px', padding: '10px', width: '100%', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>나가기</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RotationTest;