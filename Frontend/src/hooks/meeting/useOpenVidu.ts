import { useState, useCallback, useRef, useEffect } from 'react';
import { OpenVidu, Publisher, Session, StreamManager } from 'openvidu-browser';

export const useOpenVidu = () => {
    const [session, setSession] = useState<Session | undefined>(undefined);
    const [publisher, setPublisher] = useState<Publisher | undefined>(undefined);
    const [subscribers, setSubscribers] = useState<StreamManager[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // OV 객체는 렌더링과 무관하게 유지
    const OV = useRef(new OpenVidu());

    // 세션 나가기 (Cleanup)
    const leaveSession = useCallback(() => {
        if (session) {
            session.disconnect();
        }
        // 상태 초기화
        setSession(undefined);
        setPublisher(undefined);
        setSubscribers([]);
        setCurrentSessionId(null);
    }, [session]);

    // 세션 접속
    const joinSession = useCallback(async (sessionId: string, token: string, nickname: string, customVideoTrack?: MediaStreamTrack) => {
        // 이미 동일한 세션에 접속 중이면 중복 실행 방지
        if (session && currentSessionId === sessionId) {
            console.log('이미 해당 세션에 접속 중입니다:', sessionId);
            return;
        }

        // 다른 세션에 있었다면 먼저 종료
        if (session) {
            leaveSession();
        }

        // 1. 세션 객체 초기화 (연결 전 준비)
        const newSession = OV.current.initSession();

        // 2. 이벤트 리스너 설정 (상대방 입장/퇴장 감지)
        newSession.on('streamCreated', (event) => {
            const subscriber = newSession.subscribe(event.stream, undefined);
            setSubscribers((prev) => [...prev, subscriber]);
        });

        newSession.on('streamDestroyed', (event) => {
            setSubscribers((prev) => prev.filter((sub) => sub !== event.stream.streamManager));
        });

        newSession.on('exception', (exception) => {
            console.warn('OpenVidu Exception:', exception);
        });

        try {
            // -----------------------------------------------------------
            // 연결(connect)보다 카메라(Publisher)를 먼저 초기화
            // 이유: 서버 연결이 실패하더라도 내 얼굴은 화면에 띄우기 위함 + 권한 획득 보장
            // -----------------------------------------------------------
            console.log('📷 카메라/마이크 권한 요청 및 초기화 중...');

            const newPublisher = await OV.current.initPublisherAsync(undefined, {
                audioSource: undefined, // 기본 마이크
                videoSource: customVideoTrack || undefined, // undefined면 기본 웹캠, track이면 해당 track 사용
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480',
                frameRate: 30,
                insertMode: 'APPEND',
                mirror: true, // 내 얼굴은 거울 모드로
            });

            // 내 화면을 먼저 상태에 저장 (즉시 UI에 표시됨)
            setPublisher(newPublisher);
            console.log('✅ 카메라 초기화 성공');

            // 4. 세션 연결 (Token 사용)
            console.log(`🔗 세션 연결 시도: ${sessionId}`);
            await newSession.connect(token, { clientData: nickname });
            console.log(`✅ 세션 연결 성공: ${sessionId}`);

            // 5. 연결된 세션에 내 카메라 송출
            await newSession.publish(newPublisher);

            // 6. 세션 상태 업데이트
            setSession(newSession);
            setCurrentSessionId(sessionId);

        } catch (error) {
            // 에러가 나도 Publisher(내 화면)는 유지할지, 지울지 결정
            // 여기서는 에러 로그만 띄우고 내 화면은 유지하여 "카메라는 되는데 서버가 안됨"을 인지하게 함
            console.error('❌ OpenVidu Connection Error:', error);

            // 만약 연결 실패 시 카메라까지 끄고 싶다면 아래 주석 해제
            // setPublisher(undefined);
        }
    }, [session, currentSessionId, leaveSession]);

    // 컴포넌트 언마운트 시 자동 연결 해제
    useEffect(() => {
        return () => {
            if (session) session.disconnect();
        };
    }, []); // 의존성 배열 비움 (마운트 해제 시 1회 실행)

    return {
        session,
        publisher,
        subscribers,
        joinSession,
        leaveSession
    };
};