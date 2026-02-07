import React, { useEffect, useRef } from 'react';
import { StreamManager } from 'openvidu-browser';

interface Props {
    streamManager: StreamManager;
    isLocal?: boolean;
}

const UserVideo: React.FC<Props> = ({ streamManager, isLocal = false }) => {

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {

        if (streamManager && videoRef.current) {
            const videoEl = videoRef.current;

            // 1. DOM 속성 강제 설정
            // [CRITICAL] 모든 비디오를 음소거하여 브라우저 Autoplay 정책 우회
            videoEl.muted = true;
            videoEl.autoplay = true;
            videoEl.playsInline = true;

            // 2. OpenVidu에 엘리먼트 등록
            console.log('🔗 [UserVideo] Attaching video element for:', streamManager.stream.streamId);
            streamManager.addVideoElement(videoEl);

            // 3. streamPlaying 이벤트 리스너
            const handleStreamPlaying = () => {
                console.log('✅ [UserVideo] Stream is actually playing:', streamManager.stream.streamId);
            };

            streamManager.on('streamPlaying', handleStreamPlaying);

            // 4. 타임아웃 발생 시 수동 복구 로직
            const timeout = setTimeout(() => {
                // 영상이 아직 안 나오면 다시 한번 부착 시도
                if (videoEl && !videoEl.srcObject) {
                    console.warn("⚠️ [UserVideo] Stream not playing, forcing re-attachment...", streamManager.stream.streamId);
                    streamManager.addVideoElement(videoEl);
                }
            }, 4500); // streamPlaying 타임아웃(4000ms) 이후 재시도

            // 5. 자동 재생 보장 로직
            const playAttempt = setInterval(() => {
                if (videoEl.paused && videoEl.readyState >= 2) {
                    videoEl.play().catch(e => console.warn("Autoplay blocked:", e));
                }
                if (!videoEl.paused) clearInterval(playAttempt);
            }, 1000);

            return () => {
                streamManager.off('streamPlaying', handleStreamPlaying);
                clearTimeout(timeout);
                clearInterval(playAttempt);
            };
        }

    }, [streamManager, isLocal]);

    const getNickname = () => {
        // [FIX] stream.connection이 없을 수 있음 (Local Publisher 초기 상태 등)
        if (!streamManager?.stream?.connection) {
            return isLocal ? '나' : 'Unknown';
        }

        const rawData = streamManager.stream.connection.data;
        try {
            const firstParse = JSON.parse(rawData);

            // OpenVidu 구조: { clientData: "..." }
            if (firstParse.clientData) {
                try {
                    // 내부 데이터가 JSON 스트링인 경우 (우리가 보낸 포맷)
                    const innerData = JSON.parse(firstParse.clientData);
                    return innerData.nickname || innerData.clientData || firstParse.clientData;
                } catch {
                    // 내부 데이터가 그냥 문자열인 경우
                    return firstParse.clientData;
                }
            }
            return firstParse.clientData || firstParse; // 혹시비 다른 구조일 경우
        } catch {
            return rawData || 'Unknown';
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: 'black', borderRadius: '8px', overflow: 'hidden' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
                position: 'absolute', bottom: '10px', left: '10px',
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                padding: '4px 8px', borderRadius: '4px', fontSize: '14px'
            }}>
                {getNickname()} {isLocal ? '(나)' : ''}
            </div>
        </div>
    );

};

export default React.memo(UserVideo);