import { useState, useCallback, useRef, useEffect } from 'react';
import { OpenVidu, Publisher, Session, StreamManager } from 'openvidu-browser';

export const useOpenVidu = () => {
    const [session, setSession] = useState<Session | undefined>(undefined);
    const [publisher, setPublisher] = useState<Publisher | undefined>(undefined);
    const [subscribers, setSubscribers] = useState<StreamManager[]>([]);

    const currentSessionIdRef = useRef<string | null>(null);
    const OV = useRef(new OpenVidu());

    // 카메라 초기화 중복 실행 방지용 Ref
    const isInitializingRef = useRef<boolean>(false);

    /**
     * 1. 카메라 권한 요청 및 초기화 함수 (독립적으로 실행)
     */
    const initSelfCamera = useCallback(async () => {
        // 이미 publisher가 있거나 초기화 중이라면 스킵
        if (publisher || isInitializingRef.current) return publisher;

        isInitializingRef.current = true; // 락 걸기

        try {
            console.log('📷 [initSelfCamera] 카메라 권한 요청 및 초기화 시작...');
            const newPublisher = await OV.current.initPublisherAsync(undefined, {
                audioSource: undefined,
                videoSource: undefined,
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480',
                frameRate: 30,
                insertMode: 'APPEND',
                mirror: true,
            });

            setPublisher(newPublisher);
            console.log('✅ [initSelfCamera] 카메라 초기화 완료');
            isInitializingRef.current = false; // 락 해제
            return newPublisher;

        } catch (err) {
            console.error('❌ [initSelfCamera] 카메라 초기화 실패:', err);
            isInitializingRef.current = false;
            return undefined;
        }
    }, [publisher]);

    /**
     * 2. 마운트 시 즉시 카메라 실행 (서버 연결 여부와 무관하게 내 얼굴 띄우기)
     */
    useEffect(() => {
        initSelfCamera();
    }, [initSelfCamera]);

    /**
     * 3. 세션 종료 (카메라는 끄지 않음)
     */
    const leaveSession = useCallback(() => {
        if (session) {
            session.disconnect();
        }
        setSession(undefined);
        setSubscribers([]);
        currentSessionIdRef.current = null;
    }, [session]);

    /**
     * 4. 세션 접속
     */
    const joinSession = useCallback(async (sessionId: string, token: string, nickname: string) => {
        // 이미 동일 세션이면 무시
        if (currentSessionIdRef.current === sessionId) {
            return;
        }

        console.log(`🔄 [joinSession] 세션 전환 시도: ${sessionId}`);

        // 기존 세션 정리
        if (session) {
            session.disconnect();
            setSubscribers([]);
        }

        const newSession = OV.current.initSession();

        // 이벤트 리스너
        newSession.on('streamCreated', (event) => {
            const subscriber = newSession.subscribe(event.stream, undefined);
            setSubscribers((prev) => [...prev, subscriber]);
        });

        newSession.on('streamDestroyed', (event) => {
            setSubscribers((prev) => prev.filter((sub) => sub !== event.stream.streamManager));
        });

        newSession.on('exception', (exception) => {
            console.warn('⚠️ OpenVidu Exception:', exception);
        });

        try {
            // 연결 전에 카메라(publisher)가 확실히 있는지 확인
            let myPublisher = publisher;
            if (!myPublisher) {
                console.log('📷 [joinSession] 카메라가 아직 없음, 강제 초기화 시도');
                myPublisher = await initSelfCamera();
            }

            // 카메라가 없으면 연결 진행 불가 (권한 거부 등)
            if (!myPublisher) {
                console.error('❌ [joinSession] 카메라 권한이 없어 세션 연결을 중단합니다.');
                return;
            }

            // 세션 연결
            await newSession.connect(token, { clientData: nickname });
            console.log(`✅ [joinSession] 세션 연결 성공: ${sessionId}`);

            // 카메라 송출
            await newSession.publish(myPublisher);

            setSession(newSession);
            currentSessionIdRef.current = sessionId;

        } catch (error: any) {
            console.error('❌ [joinSession] OpenVidu 연결 에러 (서버 문제일 가능성 높음):', error);
            // 연결 실패해도 publisher(카메라)는 초기화하지 않음 (내 얼굴은 계속 보이게)
            setSession(undefined);
            currentSessionIdRef.current = null;
        }
    }, [session, publisher, initSelfCamera]); // 의존성

    // 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (session) session.disconnect();
            // 페이지 나갈 때는 끄기 (선택사항)
            // if (publisher) publisher.off();
        };
    }, []);

    return {
        session,
        publisher,
        subscribers,
        joinSession,
        leaveSession
    };
};