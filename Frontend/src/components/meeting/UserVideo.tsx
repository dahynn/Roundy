import React, { useEffect, useRef } from 'react';
import { StreamManager } from 'openvidu-browser';

interface Props {
    streamManager: StreamManager;
    isLocal?: boolean; // 내 화면인지 여부 (음소거 처리용)
}

const UserVideo: React.FC<Props> = ({ streamManager, isLocal = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (streamManager && videoRef.current) {
            streamManager.addVideoElement(videoRef.current);
        }
    }, [streamManager]);

    const getNicknameTag = () => {
        // OpenVidu 연결 시 { clientData: nickname }으로 보낸 데이터 파싱
        try {
            return JSON.parse(streamManager.stream.connection.data).clientData;
        } catch (err) {
            return 'Unknown';
        }
    };

    return (
        <div style={{ position: 'relative', width: '320px', height: '240px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <video
                autoPlay={true}
                ref={videoRef}
                muted={isLocal} // 내 목소리가 스피커로 들리면 하울링 발생하므로 내 영상은 음소거
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
                position: 'absolute', bottom: '10px', left: '10px',
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                padding: '2px 8px', borderRadius: '4px', fontSize: '12px'
            }}>
                {getNicknameTag()} {isLocal && '(나)'}
            </div>
        </div>
    );
};

export default UserVideo;