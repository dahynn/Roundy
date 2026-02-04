
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

    const { state: wsState, submitVote, submitGameAnswer, leaveRoom } = useRotationSystem(activeRoomId || "", userProfile);
    // [FIX] publisherReady 추가 - Publisher의 stream이 완전히 생성된 후에만 replaceTrack 실행
    const { session, publisher, subscribers, publisherReady, joinSession, leaveSession, initSelfCamera } = useOpenVidu();

    // [ADD] AI Magic Mirror Hook - canvasRef 필수! (Canvas가 DOM에 있어야 captureStream 작동)
    const { canvasRef, maskedStream, setMode, isLoaded: isAiLoaded } = useMagicMirror();

    // ---------------------------------------------------------
    // [KEY CHANGE] Vanilla Logic + Track Replacement
    // 1. 일단 웹캠을 띄운다 (즉시 송출)
    // 2. 마스킹 스트림이 준비되면 트랙만 교체한다 (끊김 없음)
    // ---------------------------------------------------------

    // 1. 초기 웹캠 실행
    useEffect(() => {
        initSelfCamera();
    }, [initSelfCamera]);

    // 2. AI 트랙 교체 - Publisher가 완전히 준비된 후에만 실행
    // [OPTIMIZATION] 500ms 지연으로 상대방의 안정적인 subscribe 유도
    useEffect(() => {
        // 1. 기본 조건 확인
        if (!publisherReady || !maskedStream || !publisher) {
            console.log("⏳ [RotationTest] Waiting for publisher or maskedStream...", {
                publisherReady,
                hasMaskedStream: !!maskedStream,
                publisherId: publisher?.stream?.streamId
            });
            return;
        }

        // 2. MediaStream 활성 상태 검증
        if (!maskedStream.active) {
            console.warn("⚠️ [RotationTest] maskedStream is not active, skipping replaceTrack");
            return;
        }

        const videoTrack = maskedStream.getVideoTracks()[0];
        if (!videoTrack) {
            console.warn("⚠️ [RotationTest] maskedStream에 videoTrack 없음");
            return;
        }

        // 3. 현재 트랙과 동일하다면 교체 스킵 (Publisher 재사용 시 핵심)
        const currentTrack = publisher.stream?.getMediaStream()?.getVideoTracks()[0];
        if (currentTrack?.id === videoTrack.id) {
            console.log("✅ [RotationTest] Track is already masked. Skipping replaceTrack.", {
                currentTrackId: currentTrack.id,
                maskedTrackId: videoTrack.id
            });
            return;
        }

        // 4. 지연 실행 (상대방의 안정적인 subscribe 유도)
        const timer = setTimeout(async () => {
            try {
                console.log("🎭 [RotationTest] Replacing track with AI Masking track (delayed 500ms)", {
                    publisherId: publisher.stream?.streamId,
                    oldTrackId: currentTrack?.id,
                    newTrackId: videoTrack.id
                });

                await publisher.replaceTrack(videoTrack);

                console.log("✅ [Roundy] replaceTrack success", {
                    publisherId: publisher.stream?.streamId,
                    newTrackId: videoTrack.id
                });
            } catch (error) {
                console.error("❌ [Roundy] replaceTrack failed:", error);
            }
        }, 500); // 500ms 지연으로 상대방 subscribe 완료 대기

        return () => clearTimeout(timer);
    }, [publisherReady, maskedStream, publisher]);

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
            joinSession(partnerInfo.sessionId, partnerInfo.token, userProfile.username);
        }
    }, [wsState.currentPartner?.sessionId, wsState.currentPartner?.token, joinSession, userProfile.username]);

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

    if (!activeRoomId) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8f9fa' }}>
                {hiddenCanvas}
                <div style={{ padding: '40px', background: 'white', borderRadius: '16px', textAlign: 'center' }}>
                    <h1>💘 Roundy Meeting</h1>
                    <p>User: <strong>{userProfile.username}</strong> ({userProfile.gender})</p>
                    <p style={{ fontSize: '14px', color: isAiLoaded ? '#10b981' : '#f59e0b', marginBottom: '15px' }}>
                        {isAiLoaded ? '✅ AI 모델 로드 완료' : '⏳ AI 모델 로딩 중...'}
                    </p>
                    <button onClick={handleEnterRoom} style={{ padding: '15px 30px', background: '#ff4081', color: 'white', border: 'none', borderRadius: '50px', fontSize: '18px', cursor: 'pointer' }}>
                        참여하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {hiddenCanvas}
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

export default RotationTest;