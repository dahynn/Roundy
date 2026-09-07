import { useState, useCallback, useRef, useEffect } from 'react';
import { OpenVidu, type Publisher, type Session, type StreamManager } from 'openvidu-browser';

function stopPublisher(publisher?: Publisher) {
    publisher?.stream?.getMediaStream()?.getTracks().forEach(track => track.stop());
}

export const useOpenVidu = () => {
    const [session, setSession] = useState<Session>();
    const [publisher, setPublisher] = useState<Publisher>();
    const [subscribers, setSubscribers] = useState<StreamManager[]>([]);
    const [error, setError] = useState<string | null>(null);
    const OV = useRef<OpenVidu | null>(null);
    if (!OV.current) {
        OV.current = new OpenVidu();
        OV.current.enableProdMode();
    }
    const mounted = useRef(true);
    const sessionRef = useRef<Session | undefined>(undefined);
    const connected = useRef(false);
    const publisherRef = useRef<Publisher | undefined>(undefined);
    const sourceTrack = useRef<MediaStreamTrack | undefined>(undefined);
    const cameraVersion = useRef(0);
    const cameraRequest = useRef<{ track?: MediaStreamTrack; promise: Promise<Publisher | undefined> } | null>(null);
    const connectionVersion = useRef(0);
    const connectionRequest = useRef<{ id: string; token: string; promise: Promise<void> } | null>(null);
    const published = useRef<{ session: Session; publisher: Publisher; promise: Promise<void> } | null>(null);

    // 카메라 준비와 서버 연결이 동시에 끝나도 같은 스트림은 한 번만 송출한다.
    const publishOnce = useCallback(async () => {
        const target = sessionRef.current;
        const camera = publisherRef.current;
        if (!target || !camera || !connected.current) return;
        if (published.current?.session === target && published.current.publisher === camera) {
            return published.current.promise;
        }
        const promise = target.publish(camera);
        published.current = { session: target, publisher: camera, promise };
        try { await promise; }
        catch (cause) {
            if (published.current?.promise === promise) published.current = null;
            throw cause;
        }
    }, []);

    const initSelfCamera = useCallback((customVideoTrack?: MediaStreamTrack, _forceNew = false): Promise<Publisher | undefined> => {
        if (!mounted.current) return Promise.resolve(undefined);
        const existing = publisherRef.current;
        const live = existing?.stream?.getMediaStream()?.getVideoTracks()[0]?.readyState === 'live';
        if (existing && live && sourceTrack.current === customVideoTrack) {
            return publishOnce().then(() => existing);
        }
        if (cameraRequest.current && cameraRequest.current.track === customVideoTrack) {
            return cameraRequest.current.promise;
        }
        const version = ++cameraVersion.current;
        const ownedTrack = customVideoTrack?.clone();
        sourceTrack.current = customVideoTrack;
        const promise = (async () => {
            try {
                const next = await OV.current!.initPublisherAsync(undefined, {
                    audioSource: undefined, videoSource: ownedTrack,
                    publishAudio: true, publishVideo: true, resolution: '640x480',
                    frameRate: 60, insertMode: 'APPEND', mirror: false,
                });
                if (!mounted.current || cameraVersion.current !== version) {
                    stopPublisher(next);
                    return undefined;
                }
                if (publisherRef.current) {
                    if (connected.current) sessionRef.current?.unpublish(publisherRef.current);
                    stopPublisher(publisherRef.current);
                }
                publisherRef.current = next;
                published.current = null;
                setPublisher(next);
                await publishOnce();
                return next;
            } catch {
                ownedTrack?.stop();
                if (mounted.current && cameraVersion.current === version) {
                    setError('카메라 또는 마이크를 준비하지 못했습니다. 브라우저 권한을 확인해 주세요.');
                }
                return undefined;
            } finally {
                if (cameraVersion.current === version) cameraRequest.current = null;
            }
        })();
        cameraRequest.current = { track: customVideoTrack, promise };
        return promise;
    }, [publishOnce]);

    const cleanupSession = useCallback((updateUI = true) => {
        ++connectionVersion.current;
        ++cameraVersion.current;
        connectionRequest.current = null;
        cameraRequest.current = null;
        const previous = sessionRef.current;
        sessionRef.current = undefined;
        connected.current = false;
        published.current = null;
        previous?.disconnect();
        stopPublisher(publisherRef.current);
        publisherRef.current = undefined;
        if (updateUI && mounted.current) {
            setSession(undefined);
            setPublisher(undefined);
            setSubscribers([]);
        }
    }, []);

    const leaveSession = useCallback(() => {
        cleanupSession();
        sourceTrack.current = undefined;
    }, [cleanupSession]);

    const joinSession = useCallback((id: string, token: string, nickname: string, customVideoTrack?: MediaStreamTrack): Promise<void> => {
        if (!mounted.current) return Promise.resolve();
        const requested = connectionRequest.current;
        if (requested?.id === id && requested.token === token) {
            // 연결 중 재렌더링은 중복 connect를 만들지 않는다. 늦게 준비된 마스킹 트랙만 연결한다.
            return customVideoTrack
                ? Promise.all([requested.promise, initSelfCamera(customVideoTrack)]).then(() => undefined)
                : requested.promise;
        }
        const track = customVideoTrack ?? sourceTrack.current;
        const needsCamera = !!track || !!publisherRef.current || !!cameraRequest.current;
        cleanupSession();
        setError(null);
        const version = connectionVersion.current;
        const next = OV.current!.initSession();
        sessionRef.current = next;
        const isCurrent = () => mounted.current && connectionVersion.current === version && sessionRef.current === next;

        next.on('streamCreated', event => {
            if (!isCurrent()) return;
            const subscriber = next.subscribe(event.stream, undefined);
            setSubscribers(prev => [...prev.filter(s => s.stream.streamId !== subscriber.stream.streamId), subscriber]);
        });
        next.on('streamDestroyed', event => {
            if (isCurrent()) setSubscribers(prev => prev.filter(s => s.stream.streamId !== event.stream.streamId));
        });
        next.on('sessionDisconnected', event => {
            if (!isCurrent() || event.reason === 'disconnect') return;
            cleanupSession();
            setError('화상 연결이 끊어졌습니다. 네트워크 상태를 확인해 주세요.');
        });

        const promise = (async () => {
            try {
                await next.connect(token, { clientData: nickname });
                if (!isCurrent()) { next.disconnect(); return; }
                connected.current = true;
                setSession(next);
                if (needsCamera) await initSelfCamera(track);
                if (isCurrent()) await publishOnce();
            } catch {
                if (!isCurrent()) { next.disconnect(); return; }
                cleanupSession();
                setError('화상 방에 연결하지 못했습니다. 연결 정보와 네트워크를 확인해 주세요.');
            }
        })();
        connectionRequest.current = { id, token, promise };
        return promise;
    }, [cleanupSession, initSelfCamera, publishOnce]);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; cleanupSession(false); };
    }, [cleanupSession]);

    return { session, publisher, subscribers, error, joinSession, leaveSession, initSelfCamera };
};
