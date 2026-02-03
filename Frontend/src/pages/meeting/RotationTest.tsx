import React, { useState, useEffect } from 'react';
import { useRotationSystem } from '../../hooks/meeting/useRotation';
import { useOpenVidu } from '../../hooks/meeting/useOpenVidu';
import UserVideo from '../../components/meeting/UserVideo';

// 테스트용 유저 데이터 (URL 파라미터 ?user=0,1,2,3 으로 선택)
const testUsers = [
    { userId: 101, username: "강병호", gender: 'MALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 102, username: "강갑호", gender: 'MALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 201, username: "김서현", gender: 'FEMALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 202, username: "임유경", gender: 'FEMALE' as const, mode: 'PAIR_ONLY' as const },
];

const RotationTestPage: React.FC = () => {
    const targetRoomId = "001"; // 접속할 방 번호

    // 1. URL 쿼리 파라미터로 유저 선택
    const [userProfile] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        // user 또는 userId 파라미터를 인덱스로 사용
        const paramVal = params.get('user') || params.get('userId') || '0';
        const userIdx = parseInt(paramVal, 10);
        return testUsers[userIdx] || testUsers[0];
    });

    // 2. 현재 활성화된 방 ID (null이면 입장 전, 값이 있으면 입장 시도)
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

    // 3. Hooks (activeRoomId가 설정되면 동작 시작)
    // useRotationSystem 내부에서 activeRoomId가 null이면 소켓 연결을 하지 않도록 처리되어 있어야 함
    const { state: wsState, submitVote, leaveRoom } = useRotationSystem(activeRoomId || "", userProfile);
    const { publisher, subscribers, joinSession, leaveSession } = useOpenVidu();

    // ---------------------------------------------------------
    // 세션 자동 접속/전환 로직 (재렌더링 방어 적용)
    // ---------------------------------------------------------
    useEffect(() => {
        const partnerInfo = wsState.currentPartner;

        // 필수 정보(세션ID, 토큰)가 있을 때만 실행
        if (partnerInfo?.sessionId && partnerInfo?.token) {
            console.log(`📝 [Effect] 세션 변경 감지: ${partnerInfo.sessionId}`);

            joinSession(
                partnerInfo.sessionId,
                partnerInfo.token,
                userProfile.username
            );
        }
    }, [
        // 중요: wsState 전체를 넣지 않고, 세션 ID와 토큰만 의존성으로 설정
        // 이렇게 해야 타이머(remainingTime)가 흘러도 재접속을 시도하지 않음
        wsState.currentPartner?.sessionId,
        wsState.currentPartner?.token,
        joinSession,
        userProfile.username
    ]);

    // ---------------------------------------------------------
    // 방 생성 시도 후 입장 (API 호출 -> 소켓 연결)
    // ---------------------------------------------------------
    const handleEnterRoom = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            console.log(`📡 방 확인/생성 요청: ${API_URL}/test/rooms`);

            // 1. 방 생성 시도 (Create if not exists)
            const response = await fetch(`${API_URL}/test/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: targetRoomId,
                    mode: 'PAIR_ONLY',
                    maxParticipants: 4, // 2남 2녀 테스트
                    roundDuration: 60
                }),
            });

            if (response.ok) {
                console.log('✅ 방이 새로 생성되었습니다.');
            } else {
                console.log('ℹ️ 방이 이미 존재하거나 생성 오류 (입장 시도)');
            }

            // 2. 방이 준비된 것으로 간주하고 웹소켓 연결 시작
            setActiveRoomId(targetRoomId);

        } catch (error) {
            console.error('API Error:', error);
            alert('❌ 서버 연결 실패. 백엔드가 실행 중인지 확인해주세요.');
        }
    };

    // --- 스테이지별 화면 렌더링 로직 ---
    const renderMainContent = () => {
        const stage = wsState.currentStage;

        const gridStyle = {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '15px',
            width: '100%'
        };

        const getVoteTitle = () => {
            if (stage === 'VOTE_FIRST') return '🗳️ 첫인상 투표';
            if (stage === 'IMAGE_GAME') return '🎨 이미지 게임';
            return '💘 최종 투표';
        };

        switch (stage) {
            case 'WAITING':
                return (
                    <div style={gridStyle}>
                        {publisher && (
                            <div style={{ border: '2px solid gold', position: 'relative' }}>
                                <UserVideo streamManager={publisher} isLocal={true} />
                                <span style={{ position: 'absolute', top: 0, left: 0, background: 'gold', padding: '2px', fontSize: '12px' }}>나 (대기실)</span>
                            </div>
                        )}

                        {/* 대기실 현황판 */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                            padding: '20px', color: '#333', background: '#fff', borderRadius: '8px', border: '1px dashed #aaa'
                        }}>
                            <h3>⏳ 매칭 대기 중...</h3>
                            <p style={{ fontSize: '20px', margin: '10px 0' }}>
                                현재 인원: <span style={{ color: '#2196f3', fontWeight: 'bold' }}>{wsState.participants.length}</span> / 4명
                            </p>
                            <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                                {wsState.participants.map(p => (
                                    p.userId !== userProfile.userId &&
                                    <span key={p.userId} style={{ background: '#eee', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                        {p.nickname}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'SELF_INTRO':
                return (
                    <div style={gridStyle}>
                        {publisher && <UserVideo streamManager={publisher} isLocal={true} />}
                        {subscribers.map((sub, i) => (
                            <div key={sub.stream.streamId} style={{ border: i === 0 ? '4px solid red' : 'none', boxSizing: 'border-box' }}>
                                <UserVideo streamManager={sub} isLocal={false} />
                            </div>
                        ))}
                    </div>
                );

            case 'ROTATION_SHORT':
            case 'ROTATION_LONG':
            case 'FACE_REVEAL':
                return (
                    <div style={gridStyle}>
                        {publisher && <UserVideo streamManager={publisher} isLocal={true} />}
                        {subscribers.map(sub => (
                            <UserVideo key={sub.stream.streamId} streamManager={sub} isLocal={false} />
                        ))}
                        {subscribers.length === 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#444', borderRadius: '8px', color: 'white' }}>
                                <p>파트너 연결 대기 중...</p>
                            </div>
                        )}
                    </div>
                );

            case 'VOTE_FIRST':
            case 'IMAGE_GAME':
            case 'VOTE_FINAL':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                        <h2>{getVoteTitle()}</h2>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {wsState.participants.map(p => {
                                if (p.userId === userProfile.userId) return null;
                                return (
                                    <button
                                        key={p.userId}
                                        onClick={() => submitVote(p.userId)}
                                        style={{
                                            width: '120px', height: '120px', borderRadius: '50%',
                                            border: 'none', background: '#ff7e5f', color: 'white',
                                            fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {p.nickname}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

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
                        {subscribers.map(sub => (
                            <UserVideo key={sub.stream.streamId} streamManager={sub} isLocal={false} />
                        ))}
                    </div>
                );
        }
    };

    // [입장 전 화면] activeRoomId가 없으면 입장 버튼을 보여줌
    if (!activeRoomId) {
        return (
            <div style={{
                height: '100vh', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', background: '#f8f9fa'
            }}>
                <div style={{
                    padding: '40px', background: 'white', borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', minWidth: '300px'
                }}>
                    <h1 style={{ marginBottom: '10px' }}>💘 Roundy Meeting</h1>
                    <p style={{ color: '#666', marginBottom: '30px' }}>
                        안녕하세요, <strong>{userProfile.username}</strong>님!<br />
                        ({userProfile.gender === 'MALE' ? '남성' : '여성'} / 매칭 모드)
                    </p>

                    <button
                        onClick={handleEnterRoom}
                        style={{
                            width: '100%', padding: '15px', fontSize: '18px', fontWeight: 'bold',
                            background: '#ff4081', color: 'white', border: 'none', borderRadius: '50px',
                            cursor: 'pointer', boxShadow: '0 4px 10px rgba(255, 64, 129, 0.3)'
                        }}
                    >
                        참여하기 (매칭 시작)
                    </button>
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '15px' }}>
                        버튼을 누르면 대기실로 입장하며, 인원이 모이면 자동 시작됩니다.
                    </p>
                </div>
            </div>
        );
    }

    // [입장 후 화면]
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h2>🎥 Rotation System Test</h2>
                    <span>User: <strong>{userProfile.username}</strong> ({userProfile.gender})</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d9534f' }}>
                        {wsState.currentStage} ({wsState.remainingTime}s)
                    </div>
                    <small>상태: {wsState.connected ? '🟢 연결됨' : '🔴 끊김'}</small>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* 메인 화면 영역 */}
                <div style={{ flex: 3, background: '#f0f0f0', padding: '20px', borderRadius: '12px', minHeight: '500px' }}>
                    {renderMainContent()}
                </div>

                {/* 사이드바 (디버깅 및 전체 참가자 현황) */}
                <div style={{ flex: 1, background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <h4>참가자 ({wsState.participants.length})</h4>
                    <ul>
                        {wsState.participants.map(p => (
                            <li key={p.userId} style={{ marginBottom: '5px', color: p.userId === userProfile.userId ? 'blue' : 'black' }}>
                                {p.nickname} {p.userId === userProfile.userId && '(나)'}
                            </li>
                        ))}
                    </ul>
                    <hr />
                    <p style={{ fontSize: '12px', color: '#666' }}>Last Msg: {wsState.lastMessage}</p>
                    <button onClick={leaveRoom} style={{ width: '100%', marginTop: '20px' }}>나가기</button>
                </div>
            </div>
        </div>
    );
};

export default RotationTestPage;