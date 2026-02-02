import { useState, useCallback, useRef, useEffect } from 'react';
import { OpenVidu, Publisher, Session, StreamManager } from 'openvidu-browser';

export const useOpenVidu = () => {

    // UI 렌더링을 위한 State
    const [session, setSession] = useState<Session | undefined>(undefined);
    const [publisher, setPublisher] = useState<Publisher | undefined>(undefined);
    const [subscribers, setSubscribers] = useState<StreamManager[]>([]);

    // 로직 내부 참조용 Ref (State 변경에 따라 함수가 재생성되는 것을 방지)
    const sessionRef = useRef<Session | undefined>(undefined);
    const subscribersRef = useRef<StreamManager[]>([]);
    const currentSessionIdRef = useRef<string | null>(null);

    // OpenVidu 객체는 컴포넌트 생애주기 동안 단 하나만 유지
    const OV = useRef(new OpenVidu());

    // 초기화 중복 실행 방지 락
    const isInitializingRef = useRef<boolean>(false);

    /**
     * 1. 카메라 권한 요청 및 초기화 (독립 실행)
     */
    const initSelfCamera = useCallback(async () => {

        if (publisher || isInitializingRef.current) return publisher;

        isInitializingRef.current = true;
        try {
            console.log('📷 [initSelfCamera] 카메라 권한 요청...');
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
            console.log('✅ [initSelfCamera] 카메라 준비 완료');
            isInitializingRef.current = false;

            return newPublisher;

        } catch (err) {
            console.error('❌ [initSelfCamera] 실패:', err);
            isInitializingRef.current = false;

            return undefined;
        }

    }, [publisher]);

    // 마운트 시 최초 1회 카메라 실행
    useEffect(() => {
        initSelfCamera();
    }, [initSelfCamera]);

    /**
     * 2. 세션 종료 및 정리 (내부 함수)
     */
    const cleanupSession = useCallback(() => {

        if (sessionRef.current) {
            console.log('🧹 기존 세션 정리 중...');
            try {
                sessionRef.current.disconnect();
            } catch (e) {
                console.warn('세션 종료 중 오류(무시 가능):', e);
            }
        }
        sessionRef.current = undefined;
        subscribersRef.current = [];

        // State 업데이트
        setSession(undefined);
        setSubscribers([]);
        currentSessionIdRef.current = null;

    }, []);

    /**
     * 3. 외부 노출용 Leave 함수
     */
    const leaveSession = useCallback(() => {
        cleanupSession();
    }, [cleanupSession]);

    /**
     * 4. 세션 접속 (핵심 로직 개선)
     * 의존성 배열을 비워서 무한 재렌더링 방지
     */
    const joinSession = useCallback(async (sessionId: string, token: string, nickname: string) => {

        // 이미 같은 세션에 접속 중이라면 무시
        if (currentSessionIdRef.current === sessionId) {
            console.log(`⚠️ 이미 접속 중인 세션입니다: ${sessionId}`);
            return;
        }

        console.log(`🔄 [joinSession] 세션 전환 시도: ${sessionId}`);

        // 1. 기존 세션이 있다면 확실히 끊기
        if (sessionRef.current) {
            cleanupSession();
            // 비동기 처리 안정성을 위해 약간의 텀을 줄 수도 있음 (선택사항)
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 2. 새 세션 객체 생성
        const newSession = OV.current.initSession();

        // 3. 이벤트 리스너 설정
        newSession.on('streamCreated', (event) => {
            console.log(`🎥 [Stream] 스트림 수신: ${event.stream.streamId}`);
            const subscriber = newSession.subscribe(event.stream, undefined);

            // Ref와 State 동기화
            subscribersRef.current = [...subscribersRef.current, subscriber];
            setSubscribers([...subscribersRef.current]);
        });

        newSession.on('streamDestroyed', (event) => {
            console.log(`🗑️ [Stream] 스트림 종료: ${event.stream.streamId}`);
            const idx = subscribersRef.current.indexOf(event.stream.streamManager);
            if (idx > -1) {
                subscribersRef.current.splice(idx, 1);
                setSubscribers([...subscribersRef.current]);
            }
        });

        newSession.on('exception', (exception) => {
            if (exception.name === 'ICE_CONNECTION_DISCONNECTED') {
                console.warn('🚨 ICE 연결 끊김 (네트워크 확인 필요)');
            }
        });

        try {
            // 4. 카메라 준비 확인 (없으면 재시도)
            let myPublisher = publisher;
            if (!myPublisher) {
                myPublisher = await initSelfCamera();
            }

            if (!myPublisher) {
                console.error('❌ 카메라가 없어 접속을 중단합니다.');
                return;
            }

            // 5. 세션 연결
            await newSession.connect(token, { clientData: nickname });

            // 6. 내 화면 송출
            await newSession.publish(myPublisher);
            console.log(`✅ [joinSession] 접속 성공: ${sessionId}`);

            // 7. Ref 및 State 업데이트
            sessionRef.current = newSession;
            setSession(newSession);
            currentSessionIdRef.current = sessionId;

        } catch (error) {
            console.error('❌ 세션 연결 실패:', error);
            cleanupSession(); // 실패 시 상태 초기화
        }

    }, [cleanupSession, initSelfCamera, publisher]);
    // 주의: session, subscribers 등 변하는 State는 의존성에 넣지 않음!

    // 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (sessionRef.current) {
                sessionRef.current.disconnect();
            }
        };
    }, []);

    return { session, publisher, subscribers, joinSession, leaveSession };

};