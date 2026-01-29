import React, { useState, useEffect } from 'react';
import { useRotationSystem } from '../../hooks/meeting/useRotation.ts';
import { useOpenVidu } from '../../hooks/meeting/useOpenVidu.ts';
import UserVideo from '../../components/meeting/UserVideo';

const RotationTestPage: React.FC = () => {
    const roomId = "001";

    // 1. 유저 프로필 생성 (고유 ID)
    const [userProfile] = useState({
        userId: Math.floor(Math.random() * 10000),
        username: `User-${Math.floor(Math.random() * 100)}`,
        gender: 'MALE' as const,
        mode: 'PAIR_ONLY' as const
    });

    // 2. 웹소켓 Hook (로테이션 상태 관리)
    const { state: wsState, submitVote, leaveRoom } = useRotationSystem(roomId, userProfile);

    // 3. OpenVidu Hook (화상 통화 관리)
    const { publisher, subscribers, joinSession, leaveSession } = useOpenVidu();

    // 4. 웹소켓 매칭 정보가 바뀌면 -> OpenVidu 세션 자동 전환
    useEffect(() => {
        const partnerInfo = wsState.currentPartner;

        if (partnerInfo && partnerInfo.sessionId && partnerInfo.token) {
            console.log(`🔄 세션 전환 시도: ${partnerInfo.sessionId}`);

            // joinSession 내부에서 기존 세션 종료 후 새 세션 연결 처리됨
            joinSession(
                partnerInfo.sessionId,
                partnerInfo.token,
                userProfile.username
            );
        } else {
            // 매칭 정보가 없거나 토큰이 없으면 연결 해제
            // (단, WAITING 단계에서 대기실 토큰이 유지된다면 이 부분 조건 조정 필요)
            // leaveSession();
        }
    }, [wsState.currentPartner, joinSession, userProfile.username]); // 의존성: 파트너 정보 변경 시 실행

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                <h1>🎥 로테이션 화상 테스트</h1>
                <div>
                    내 정보: <strong>{userProfile.username}</strong> (ID: {userProfile.userId}) |
                    상태: <span style={{ color: wsState.connected ? 'green' : 'red' }}>
            {wsState.connected ? 'WS 연결됨' : 'WS 연결 끊김'}
          </span>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* 왼쪽: 화상 통화 화면 */}
                <div style={{ flex: 3 }}>
                    <div style={{ background: '#222', padding: '20px', borderRadius: '12px', minHeight: '500px' }}>
                        <h3 style={{ color: 'white', marginTop: 0 }}>
                            현재 세션: {wsState.currentPartner?.sessionId || '대기 중'}
                        </h3>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                            {/* 내 화면 (Publisher) */}
                            {publisher ? (
                                <div style={{ border: '2px solid #ffff00' }}>
                                    <UserVideo streamManager={publisher} isLocal={true} />
                                </div>
                            ) : (
                                <div style={{ color: '#aaa', padding: '20px' }}>카메라 연결 중...</div>
                            )}

                            {/* 상대방 화면들 (Subscribers) */}
                            {subscribers.map((sub, i) => (
                                <div key={i} style={{ border: '2px solid #00ff00' }}>
                                    <UserVideo streamManager={sub} isLocal={false} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 로테이션 상태 및 컨트롤 패널 */}
                <div style={{ flex: 1, background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                    <h3>📋 스테이지: {wsState.currentStage}</h3>
                    <h2 style={{ color: '#d9534f' }}>⏱ {wsState.remainingTime}초</h2>
                    <hr />

                    <p><strong>메시지:</strong> {wsState.lastMessage || '-'}</p>

                    <h4>참가자 목록 ({wsState.participants.length}명)</h4>
                    <ul style={{ paddingLeft: '20px' }}>
                        {wsState.participants.map(p => (
                            <li key={p.userId} style={{ marginBottom: '5px' }}>
                                {p.nickname}
                                {p.userId !== userProfile.userId && (
                                    <button
                                        onClick={() => submitVote(p.userId)}
                                        style={{ marginLeft: '8px', cursor: 'pointer' }}
                                    >
                                        투표
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>

                    <div style={{ marginTop: '20px' }}>
                        <button
                            onClick={leaveRoom}
                            style={{ width: '100%', padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
                        >
                            나가기 (연결 종료)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RotationTestPage;