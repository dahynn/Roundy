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

            // 1. DOM 속성 강제 설정 (브라우저 정책 대응)
            videoEl.muted = isLocal; // 로컬은 음소거 필수
            videoEl.autoplay = true;
            videoEl.playsInline = true;

            // 2. OpenVidu에 엘리먼트 등록
            streamManager.addVideoElement(videoEl);

            // 3. 자동 재생 보장 로직 (혹시 멈춰있을 경우 대비)
            const playAttempt = setInterval(() => {
                if (videoEl.paused && videoEl.readyState >= 2) {
                    videoEl.play().catch(e => console.warn("Autoplay blocked:", e));
                }
                // 재생 중이면 인터벌 종료
                if (!videoEl.paused) clearInterval(playAttempt);
            }, 1000);

            return () => clearInterval(playAttempt);
        }

    }, [streamManager, isLocal]);

    const getNickname = () => {
        const rawData = streamManager.stream.connection.data;
        try {
            const parsed = JSON.parse(rawData);
            return parsed.clientData || parsed;
        } catch {
            return rawData || 'Unknown';
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            {/* React muted 속성은 가끔 늦게 반영되므로 ref로 제어하지만, 초기값을 위해 남겨둠 */}
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

export default UserVideo;