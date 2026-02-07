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
    const publisherRef = useRef<Publisher | undefined>(undefined); // [New] Logic-side ref

    // OpenVidu 객체는 컴포넌트 생애주기 동안 단 하나만 유지 (Lazy Init)
    const OV = useRef<OpenVidu>(null);
    if (!OV.current) {
        OV.current = new OpenVidu();
        OV.current.enableProdMode(); // 불필요한 로그 숨기기
    }

    // 초기화 중복 실행 방지 락
    const isInitializingRef = useRef<boolean>(false);

    /**
     * 1. 카메라 권한 요청 및 초기화 (독립 실행)
     */
    const initSelfCamera = useCallback(async (customVideoTrack?: MediaStreamTrack, forceNew: boolean = false) => {

        // [Fix] 마스킹 트랙(customVideoTrack)이 주어지면 
        // replaceTrack 대신 아예 새 Publisher를 만드는 것이 UI 동기화에 더 확실합니다.
        if (customVideoTrack) {
            console.log('🎭 [initSelfCamera] 마스킹 트랙 감지. 새 Publisher 생성 시도...');
            forceNew = true;
        }

        const currentPub = publisherRef.current;
        if (currentPub && !forceNew) {
            return currentPub;
        }

        // --- Re-Initialization Logic ---
        // 기존 publisher가 있다면 정리 (필요 시) - OpenVidu는 initPublisherAsync 호출 시 이전 객체 무효화 여부 확인 필요
        // 여기서는 안전하게 새로 생성
        if (isInitializingRef.current) return publisherRef.current;

        isInitializingRef.current = true;
        try {
            console.log('📷 [initSelfCamera] 카메라 권한 요청...');

            // [FIX] 트랙 복제: OpenVidu가 트랙을 stop시켜도 원본 maskedStream은 유지됨
            // OpenVidu SDK는 전달받은 트랙을 내부적으로 관리하며, disconnect 시 stop시킴
            // 따라서 원본 트랙 대신 복제본을 전달해야 maskedStream이 계속 살아있음
            const videoSourceTrack = customVideoTrack ? customVideoTrack.clone() : undefined;
            if (videoSourceTrack) {
                console.log('🔄 [initSelfCamera] 트랙 복제 완료:', videoSourceTrack.id);
            }

            const newPublisher = await OV.current!.initPublisherAsync(undefined, {
                audioSource: undefined,
                videoSource: videoSourceTrack || undefined, // Use CLONED track if provided
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480',
                frameRate: 60,
                insertMode: 'APPEND',
                mirror: false, // Mirror false for masking
            });

            setPublisher(newPublisher); // UI Update
            publisherRef.current = newPublisher; // Logic Update
            console.log('✅ [initSelfCamera] 카메라 준비 완료');

            // [ROBUST PATTERN] 이미 세션에 접속 중이라면 즉시 송출
            if (sessionRef.current) {
                console.log('📤 [initSelfCamera] 기존 세션에 즉시 Publish');
                sessionRef.current.publish(newPublisher).catch(e => console.error('Publish Fail:', e));
            }

            isInitializingRef.current = false;

            return newPublisher;

        } catch (err) {
            console.error('❌ [initSelfCamera] 실패:', err);
            isInitializingRef.current = false;

            return undefined;
        }

    }, []); // No dependencies!

    // [FIX] 자동 초기화 제거: CamTestPage에서 maskedStream 준비 후 명시적으로 호출하도록 함
    // useEffect(() => {
    //     initSelfCamera();
    // }, [initSelfCamera]);

    /**
     * 2. 세션 종료 및 정리 (내부 함수)
     */
    const cleanupSession = useCallback(() => {

        // [FIX] 1. 먼저 배열 비우기 (UI 즉시 업데이트, 레이스 컨디션 방지)
        setSubscribers([]);
        subscribersRef.current = [];
        setSession(undefined);
        currentSessionIdRef.current = null;

        // [FIX] 2. 그 다음 disconnect (이벤트 발생해도 이미 빈 배열)
        if (sessionRef.current) {
            console.log('🧹 기존 세션 정리 중...');
            try {
                sessionRef.current.disconnect();
            } catch (e) {
                console.warn('세션 종료 중 오류(무시 가능):', e);
            }
            sessionRef.current = undefined;
        }

        console.log('🔄 [cleanupSession] 정리 완료');

        // [VANILLA PATTERN] Publisher는 재사용 - 세션 전환해도 유지
        // AI 마스킹 트랙을 사용하는 Publisher를 여러 세션에서 재사용 가능
        // setPublisher(undefined);
        // publisherRef.current = undefined;

    }, []);

    /**
     * 3. 외부 노출용 Leave 함수
     */
    const leaveSession = useCallback(() => {
        cleanupSession();
    }, [cleanupSession]);

    /**
     * 4. 세션 접속 (핵심 로직 개선)
     */
    const joinSession = useCallback(async (sessionId: string, token: string, nickname: string, customVideoTrack?: MediaStreamTrack) => {

        // 이미 같은 세션에 접속 중이라면 무시
        if (currentSessionIdRef.current === sessionId) {
            // [Fix] 이미 접속 중이더라도 트랙이 새로 들어왔다면 교체 시도
            if (customVideoTrack && publisherRef.current) {
                console.log("🔄 [joinSession] 이미 접속됨. 새로운 마스킹 트랙으로 교체 시도...");
                await initSelfCamera(customVideoTrack);
            } else {
                console.log(`⚠️ 이미 접속 중인 세션입니다: ${sessionId}`);
            }
            return;
        }

        // [FIX] Mixed Content 방지: ws:// -> wss:// 강제 변환
        if (token.startsWith('ws://')) {
            console.warn('⚠️ [useOpenVidu] Insecure WS token detected. Upgrading to WSS...');
            token = token.replace('ws://', 'wss://');
        }

        console.log(`🔄 [joinSession] 세션 접속 시도: ${sessionId}`);

        // 1. 기존 세션이 있다면 확실히 끊기
        // [FIX] 세션 전환 딜레이 증가 (300ms → 500ms) - 안정적인 세션 전환을 위해
        if (sessionRef.current) {
            cleanupSession();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 2. 새 세션 객체 생성
        const newSession = OV.current!.initSession();

        // 3. 이벤트 리스너 설정
        newSession.on('streamCreated', (event) => {
            const subscriber = newSession.subscribe(event.stream, undefined);
            console.log('🎉 [OpenVidu] streamCreated! Subscriber added:', subscriber.stream.streamId);
            setSubscribers((prev) => {
                const newSubs = [...prev, subscriber];
                console.log('📊 [OpenVidu] Current Subscribers Count:', newSubs.length);
                return newSubs;
            });
        });

        newSession.on('streamDestroyed', (event) => {
            console.log('🗑️ [OpenVidu] streamDestroyed:', event.stream.streamId);
            setSubscribers((prev) => prev.filter((sub) => sub.stream.streamId !== event.stream.streamId));
        });

        newSession.on('exception', (exception) => {
            if (exception.name === 'ICE_CONNECTION_DISCONNECTED') {
                console.warn('🚨 ICE 연결 끊김 (네트워크 확인 필요)');
            }
        });

        // [NEW] 서버측 세션 종료 감지
        newSession.on('sessionDisconnected', (event) => {
            console.warn('🔌 [OpenVidu] 세션 연결 해제됨:', event.reason);
            if (event.reason !== 'disconnect') {
                // 의도치 않은 해제일 경우 정리
                cleanupSession();
            }
        });

        try {
            // 4. [VANILLA PATTERN] Publisher는 별도 관리
            // Publisher가 이미 있으면 그대로 사용, 없으면 나중에 initSelfCamera에서 publish 될 것임
            let myPublisher = publisherRef.current;

            // 5. 세션 연결
            await newSession.connect(token, { clientData: nickname });
            console.log(`✅ [joinSession] 세션 연결 완료: ${sessionId}`);

            // 7. Ref 및 State 업데이트 (Publish 전에 먼저 설정하여 initSelfCamera가 참조 가능하도록 함)
            sessionRef.current = newSession;
            setSession(newSession);
            currentSessionIdRef.current = sessionId;

            // [NEW] 기존 Publisher가 있다면 트랙 상태 확인 후 Publish
            if (publisherRef.current) {
                console.log('📤 [joinSession] Publisher publish 시작');

                // 🔍 트랙 상태 검증
                const mediaStream = publisherRef.current.stream?.getMediaStream();
                const videoTrack = mediaStream?.getVideoTracks()[0];

                if (!videoTrack || videoTrack.readyState !== 'live') {
                    console.warn('⚠️ [joinSession] Publisher 트랙이 무효화됨!', {
                        hasMediaStream: !!mediaStream,
                        hasVideoTrack: !!videoTrack,
                        trackState: videoTrack?.readyState
                    });

                    // customVideoTrack이 제공되었다면 새 Publisher 생성
                    if (customVideoTrack && customVideoTrack.readyState === 'live') {
                        console.log('🔄 [joinSession] 새로운 트랙으로 Publisher 재생성...');
                        await initSelfCamera(customVideoTrack, true);

                        // 재생성된 Publisher로 publish
                        if (publisherRef.current) {
                            try {
                                await newSession.publish(publisherRef.current);
                                console.log('📤 [joinSession] 새 Publisher publish 완료');
                            } catch (err) {
                                console.error('❌ [joinSession] 새 Publisher publish 실패:', err);
                            }
                        }
                    } else {
                        console.error('❌ [joinSession] 유효한 트랙이 없어 publish 불가');
                    }
                } else {
                    // 트랙이 유효하면 기존 Publisher 그대로 사용
                    try {
                        await newSession.publish(publisherRef.current);
                        console.log('📤 [joinSession] Publisher publish 완료');
                    } catch (err) {
                        console.error('❌ [joinSession] Publisher publish 실패:', err);
                    }
                }
            } else {
                console.log('⏳ [joinSession] Publisher 없음. maskedStream 준비 후 생성될 예정...');
            }

        } catch (error: any) {
            console.error('❌ [joinSession] 세션 연결 실패:', error);
            if (error.code === 401) {
                console.error("🚫 401 Unauthorized: Token is invalid. Check Server/Docker.");
            }
            cleanupSession();
        }

    }, [cleanupSession, initSelfCamera]); // Stable dependencies

    // 주의: session, subscribers 등 변하는 State는 의존성에 넣지 않음!

    // 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (sessionRef.current) {
                sessionRef.current.disconnect();
            }
        };
    }, []);

    return {
        session,
        publisher,
        subscribers,
        joinSession,
        leaveSession,
        initSelfCamera,
    };

};