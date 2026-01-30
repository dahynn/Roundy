import React, { useState, useEffect } from 'react';
import { useRotationSystem } from '../../hooks/meeting/useRotation';
import { useOpenVidu } from '../../hooks/meeting/useOpenVidu';
import UserVideo from '../../components/meeting/UserVideo';

// 테스트용 유저 데이터 (URL 파라미터 ?user=0,1,2,3 으로 선택)
const testUsers = [
    { userId: 101, username: "강병호", gender: 'MALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 102, username: "강갑호", gender: 'MALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 201, username: "강을호", gender: 'FEMALE' as const, mode: 'PAIR_ONLY' as const },
    { userId: 202, username: "강정호", gender: 'FEMALE' as const, mode: 'PAIR_ONLY' as const },
];

const RotationTestPage: React.FC = () => {
    const roomId = "001";

    // 1. URL 쿼리 파라미터로 유저 선택
    const [userProfile] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const userIdx = parseInt(params.get('user') || '0', 10);
        return testUsers[userIdx] || testUsers[0];
    });

    const { state: wsState, submitVote, leaveRoom } = useRotationSystem(roomId, userProfile);
    const { publisher, subscribers, joinSession } = useOpenVidu();

    // 2. 세션 전환 로직 (Lobby <-> Private Room)
    useEffect(() => {
        const partnerInfo = wsState.currentPartner;
        if (partnerInfo?.sessionId && partnerInfo?.token) {
            joinSession(partnerInfo.sessionId, partnerInfo.token, userProfile.username);
        }
    }, [wsState.currentPartner?.sessionId, wsState.currentPartner?.token]); // 의존성 체크

    // --- 스테이지별 화면 렌더링 로직 ---
    const renderMainContent = () => {
        const stage = wsState.currentStage;

        // 공통 스타일: 비디오 그리드
        const gridStyle = {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '15px',
            width: '100%'
        };

        // 타이틀 헬퍼 함수
        const getVoteTitle = () => {
            if (stage === 'VOTE_FIRST') return '🗳️ 첫인상 투표';
            if (stage === 'IMAGE_GAME') return '🎨 이미지 게임';
            return '💘 최종 투표';
        };

        switch (stage) {
            case 'WAITING': // 내 화면만 보임
                return (
                    <div style={gridStyle}>
                        {publisher && (
                            <div style={{ border: '2px solid gold', position: 'relative' }}>
                                <UserVideo streamManager={publisher} isLocal={true} />
                                <span style={{position:'absolute', top:0, left:0, background:'gold', padding:'2px'}}>대기 중</span>
                            </div>
                        )}
                        {/* subscribers는 숨김 */}
                        {subscribers.length > 0 && <div style={{color:'#666'}}>다른 참가자 {subscribers.length}명 대기 중...</div>}
                    </div>
                );

            case 'SELF_INTRO': // 모든 참가자 보임 + 현재 순서 강조 (테두리)
                // 임시: 현재 발화자가 누구인지 정보가 없다면 첫 번째 사람이라고 가정하거나,
                // StreamManager의 speaking 이벤트를 활용해야 함. 여기선 빨간 테두리로 예시.
                return (
                    <div style={gridStyle}>
                        {publisher && <UserVideo streamManager={publisher} isLocal={true} />}
                        {subscribers.map((sub, i) => (
                            // 예시: 0번 인덱스 참가자를 현재 발화자로 가정하여 테두리 표시
                            <div key={sub.stream.streamId} style={{
                                border: i === 0 ? '4px solid red' : 'none',
                                boxSizing: 'border-box'
                            }}>
                                <UserVideo streamManager={sub} isLocal={false} />
                            </div>
                        ))}
                    </div>
                );

            // 연결된 참가자와 내 화면만 보임 (1:1)
            // useRotationSystem에서 이미 Private Session으로 전환했으므로,
            // subscribers에는 파트너 한 명만 존재하게 됨.
            case 'ROTATION_SHORT':
            case 'ROTATION_LONG':
            case 'FACE_REVEAL':
                return (
                    <div style={gridStyle}>
                        {publisher && <UserVideo streamManager={publisher} isLocal={true} />}

                        {/* 구독자(파트너) 영상 렌더링 */}
                        {subscribers.map(sub => (
                            <UserVideo key={sub.stream.streamId} streamManager={sub} isLocal={false} />
                        ))}

                        {/* 연결은 되었으나 상대방이 아직 안 들어온 경우 */}
                        {subscribers.length === 0 && (
                            <div style={{ color: '#fff', padding: '20px', background: '#444', borderRadius: '8px' }}>
                                <p>파트너 연결 대기 중...</p>
                                <small>(상대방이 접속하면 화면이 나타납니다)</small>
                            </div>
                        )}
                    </div>
                );

            // 화면 없이 버튼만 보임 (이미지 게임/최종투표)
            case 'VOTE_FIRST':
            case 'IMAGE_GAME':
            case 'VOTE_FINAL':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                        <h2>{getVoteTitle()}</h2>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {wsState.participants.map(p => {
                                if (p.userId === userProfile.userId) return null; // 나 자신 제외
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

            // 결과 화면
            case 'MATCHING_RESULT':
                return (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <h1>결과 발표</h1>
                        <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{wsState.lastMessage}</p>
                    </div>
                );

            // 그냥 다 보여줌
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

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            {/* 상단 헤더 */}
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