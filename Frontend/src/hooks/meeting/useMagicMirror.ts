import { useEffect, useRef, useState } from 'react';

// MediaPipe 전역 객체 타입 정의 (간소화)
declare global {
    interface Window {
        SelfieSegmentation: any;
        FaceMesh: any;
        Camera: any;
        drawConnectors: any;
        FACEMESH_TESSELATION: any;
        FACEMESH_LIPS: any;
        FACEMESH_RIGHT_EYE: any;
        FACEMESH_LEFT_EYE: any;
        FACEMESH_FACE_OVAL: any;
        lastSegmentationResult: any;
    }
}

export type MaskMode = 'NORMAL' | 'BLACK' | 'SILHOUETTE' | 'NOSE_MASK' | 'LANDMARK';

export interface MagicMirrorResult {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    maskedStream: MediaStream | null; // OpenVidu로 보낼 스트림
    isStreamReady: boolean; // ⭐ maskedStream 준비 완료 신호
    setMode: (mode: MaskMode) => void;
    currentMode: MaskMode;
    isLoaded: boolean;
    isFaceDetected: boolean;
}

export const useMagicMirror = (): MagicMirrorResult => {
    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement | null>(null); // 소스 (WebCam)
    const outputCanvasRef = useRef<HTMLCanvasElement>(null); // 최종 렌더링 & 스트림 추출용
    const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null); // 임시 버퍼 (마스킹용)
    const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);   // 임시 버퍼 2

    const modeRef = useRef<number>(0);
    const selfieSegmentationRef = useRef<any>(null);
    const faceMeshRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);

    // 스트림 저장
    const [maskedStream, setMaskedStream] = useState<MediaStream | null>(null);
    const [isStreamReady, setIsStreamReady] = useState(false); // ⭐ 스트림 준비 상태

    // 상태
    const [currentModeName, setCurrentModeName] = useState<MaskMode>('NORMAL');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isFaceDetected, setIsFaceDetected] = useState(false);

    // 모드 매핑
    const MODE_MAP: Record<MaskMode, number> = {
        'NORMAL': 0,
        'BLACK': 1,
        'SILHOUETTE': 2,
        'NOSE_MASK': 3,
        'LANDMARK': 4
    };

    const setMode = (mode: MaskMode) => {
        setCurrentModeName(mode);
        modeRef.current = MODE_MAP[mode];
    };

    // 4. 성능 최적화: 추론 중일 때 중복 실행 방지 락
    const isProcessingRef = useRef<boolean>(false);

    // 1. 필요한 Canvas/Video 엘리먼트 생성
    useEffect(() => {
        console.log("🎬 [useMagicMirror] Hook Mounted via useEffect (Once)");

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        videoRef.current = video;

        const hidden = document.createElement('canvas');
        hidden.width = 640;
        hidden.height = 480;
        hiddenCanvasRef.current = hidden;

        const temp = document.createElement('canvas');
        temp.width = 640;
        temp.height = 480;
        tempCanvasRef.current = temp;

        return () => {
            if (videoRef.current && videoRef.current.parentNode) {
                videoRef.current.parentNode.removeChild(videoRef.current);
            }
        };
    }, []);

    // 2. 카메라 및 모델 초기화
    useEffect(() => {
        let isMounted = true;
        let stream: MediaStream | null = null;
        let animationFrameId: number = 0; // Initialize with 0

        const startCamera = async () => {
            if (!videoRef.current) return;

            try {
                console.log("📷 [useMagicMirror] 카메라 권한 요청 시작...");
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, frameRate: { ideal: 60 } },
                    audio: false
                });

                if (isMounted && videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    console.log("✅ [useMagicMirror] 카메라 스트림 연결 성공");

                    // [Optimization] 첫 프레임 즉시 그리기 (CaptureStream 활성화 유도)
                    if (outputCanvasRef.current) {
                        outputCanvasRef.current.width = 640;
                        outputCanvasRef.current.height = 480;
                        const ctx = outputCanvasRef.current.getContext('2d');
                        if (ctx) ctx.fillRect(0, 0, 640, 480);
                    }
                }
            } catch (err) {
                console.error("❌ [useMagicMirror] 카메라 권한 거부됨:", err);
                // alert("카메라 사용 권한이 필요합니다. 브라우저 설정에서 허용해주세요.");
            }
        };


        // ... (previous useEffects)

        const onResults = (results: any) => {
            // [Stability] Canvas Refs Valid Check
            if (!outputCanvasRef.current || !hiddenCanvasRef.current || !tempCanvasRef.current) return;

            const canvasCtx = outputCanvasRef.current.getContext('2d');
            const hiddenCtx = hiddenCanvasRef.current.getContext('2d');
            const tempCtx = tempCanvasRef.current.getContext('2d');

            if (!canvasCtx || !hiddenCtx || !tempCtx) return;

            const activeMode = modeRef.current; // 0: Normal, 1: Black, 2: Silhouette, 3: NoseMask, 4: Landmark
            const { width, height } = outputCanvasRef.current;

            // [Rendering] Canvas Size Sync
            if (hiddenCanvasRef.current.width !== width) hiddenCanvasRef.current.width = width;
            if (hiddenCanvasRef.current.height !== height) hiddenCanvasRef.current.height = height;
            if (tempCanvasRef.current.width !== width) tempCanvasRef.current.width = width;
            if (tempCanvasRef.current.height !== height) tempCanvasRef.current.height = height;

            // [Debug] Draw log (Sampled) - Disabled for user comfort
            // if (Math.random() < 0.01) console.log("🖌️ [useMagicMirror] Draw:", { mode: activeMode, detected: results.multiFaceLandmarks?.length > 0 });

            // [DEBUG] Check Logic - Disabled
            // if (!isLoaded && outputCanvasRef.current) {
            //     console.log("👀 [useMagicMirror] First Frame Drawn on Canvas!");
            // }

            const lastSegmentationResult = window.lastSegmentationResult;
            const detected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
            setIsFaceDetected(detected);

            // Clear Buffers
            hiddenCtx.clearRect(0, 0, width, height);
            canvasCtx.save();
            canvasCtx.imageSmoothingEnabled = true;
            canvasCtx.clearRect(0, 0, width, height);

            if (activeMode === 0) { // Normal
                canvasCtx.drawImage(results.image, 0, 0, width, height);
            } else if (activeMode === 1) { // Black
                canvasCtx.fillStyle = 'black';
                canvasCtx.fillRect(0, 0, width, height);
            } else if (activeMode === 2) { // Silhouette
                // Note: Silhouette requires SelfieSegmentation result
                // We stored it in window.lastSegmentationResult
                const segResult = window.lastSegmentationResult;

                if (segResult && segResult.segmentationMask) {
                    tempCtx.save();
                    tempCtx.clearRect(0, 0, width, height);

                    // 1. Draw Mask to Temp Canvas
                    // SegmentationMask is an ImageBitmap or ImageData
                    tempCtx.drawImage(segResult.segmentationMask, 0, 0, width, height);

                    // 2. Composite: Logic to cutout person
                    // Source-In: Keep only where mask is drawn?
                    // Typically: Mask is white for person, black for background.
                    // Or standard Mediapipe: White = Person.
                    tempCtx.globalCompositeOperation = 'source-in';
                    tempCtx.fillStyle = 'black'; // Person color
                    tempCtx.fillRect(0, 0, width, height);

                    // But if we want 'Silhouette', we usually mean black shape of person on colored background.
                    tempCtx.restore();

                    // 3. Final Draw on Output Canvas
                    // A. Draw Background (Pink)
                    canvasCtx.fillStyle = '#404245';
                    canvasCtx.fillRect(0, 0, width, height);

                    // B. Draw Person Shape (Black) 
                    // Use the temp buffer as mask
                    canvasCtx.save();
                    canvasCtx.drawImage(tempCanvasRef.current, 0, 0, width, height);

                    // We need to verify what segmentationMask looks like.
                    // Usually it's the shape of the person.
                    // If we want detailed silhouette:
                    //   Draw Mask -> Source-In with Black -> Draw to Main.

                    // Simplified:
                    // Draw Mask (Person Shape) -> Fill Black
                    canvasCtx.globalCompositeOperation = 'source-over';
                    canvasCtx.drawImage(segResult.segmentationMask, 0, 0, width, height);

                    // Fill the person shape with Black
                    // Because segmentationMask might be the camera image cut out? 
                    // No, it's a mask. 

                    // Let's use the standard "Masking" approach provided by MediaPipe samples
                    // But here, let's just use destination-in to cut the black rectangle.

                    // Optimized Silhouette Logic:
                    // 1. Fill Canvas with Black (Person Color)
                    canvasCtx.fillStyle = 'black';
                    canvasCtx.fillRect(0, 0, width, height);

                    // 2. Cut out the person using destination-in
                    canvasCtx.globalCompositeOperation = 'destination-in';
                    canvasCtx.drawImage(segResult.segmentationMask, 0, 0, width, height);

                    // 3. Draw Background behind (using composite destination-over)
                    canvasCtx.globalCompositeOperation = 'destination-over';
                    canvasCtx.fillStyle = '#404245'; // Pink Background
                    canvasCtx.fillRect(0, 0, width, height);

                    canvasCtx.restore();
                } else {
                    // Fallback if no mask yet: Pink (to indicate NO MASK) instead of Black
                    canvasCtx.fillStyle = '#404245'; // Pink
                    canvasCtx.fillRect(0, 0, width, height);

                    // Text to Debug
                    canvasCtx.font = "20px Arial";
                    canvasCtx.fillStyle = "red";
                    canvasCtx.fillText("No Segmentation Mask", 10, 50);
                }


            } else if (activeMode === 3) { // Nose Mask
                if (detected) {
                    canvasCtx.drawImage(results.image, 0, 0, width, height);
                    const noseY = results.multiFaceLandmarks[0][1].y * height;
                    canvasCtx.fillStyle = 'black';
                    canvasCtx.fillRect(0, 0, width, noseY);
                } else {
                    canvasCtx.fillStyle = 'black';
                    canvasCtx.fillRect(0, 0, width, height);
                }
            } else if (activeMode === 4) { // Landmark
                canvasCtx.fillStyle = 'black';
                canvasCtx.fillRect(0, 0, width, height);

                if (detected && window.drawConnectors) {
                    const landmarks = results.multiFaceLandmarks[0];
                    const { drawConnectors, FACEMESH_TESSELATION, FACEMESH_LIPS, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYE, FACEMESH_FACE_OVAL } = window;

                    // [Stability] Global helpers check
                    if (drawConnectors && FACEMESH_TESSELATION) {
                        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#10b981', lineWidth: 0.5 });
                        drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, { color: '#ffffff', lineWidth: 1.5 });
                        drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, { color: '#34d399', lineWidth: 1.5 });
                        drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, { color: '#34d399', lineWidth: 1.5 });
                        drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, { color: '#10b981', lineWidth: 1 });
                    }
                }
            }
            canvasCtx.restore();
        };

        const processFrame = async () => {
            if (!isMounted || !videoRef.current) return;

            if (videoRef.current.paused || videoRef.current.ended) {
                animationFrameId = requestAnimationFrame(processFrame);
                return;
            }

            // [Performance] Frame Drop if busy
            if (isProcessingRef.current) {
                // console.warn("🏃‍♂️ [useMagicMirror] Frame dropped (Busy)");
                animationFrameId = requestAnimationFrame(processFrame);
                return;
            }

            isProcessingRef.current = true;

            try {
                if (videoRef.current.readyState >= 2) {
                    const activeMode = modeRef.current;

                    // [Performance] Optimized FPS for premium experience (60 FPS)
                    // Note: Actual FPS depends on hardware capability (especially with AI models)
                    const targetFps = 60;
                    const minFrameTime = 1000 / targetFps;
                    const now = performance.now();
                    const lastFrameTime = (processFrame as any).lastTime || 0;

                    if (now - lastFrameTime < minFrameTime) {
                        isProcessingRef.current = false;
                        animationFrameId = requestAnimationFrame(processFrame);
                        return;
                    }
                    (processFrame as any).lastTime = now;

                    // [Performance] Selective Inference & Rendering Driver
                    // 1. SILHOUETTE Mode (2): Only use SelfieSegmentation
                    if (activeMode === 2 && selfieSegmentationRef.current) {
                        await selfieSegmentationRef.current.send({ image: videoRef.current });
                    }
                    // 2. Other Modes: Use FaceMesh (also drives NORMAL mode rendering)
                    else if (faceMeshRef.current) {
                        await faceMeshRef.current.send({ image: videoRef.current });
                    }
                }
            } catch (e) {
                console.error("🔥 [useMagicMirror] processing error:", e);
            } finally {
                isProcessingRef.current = false;
            }

            animationFrameId = requestAnimationFrame(processFrame);
        };

        const initModels = async () => {
            if (!isMounted) return;
            if (typeof window.SelfieSegmentation === 'undefined' || typeof window.FaceMesh === 'undefined') {
                setTimeout(initModels, 100);
                return;
            }

            // 중복 초기화 방지 및 기존 모델 정리 (Strict Mode에서 두 번 실행될 경우)
            if (selfieSegmentationRef.current) {
                try { await selfieSegmentationRef.current.close(); } catch (e) { console.error("Error closing old SelfieSegmentation:", e); }
                selfieSegmentationRef.current = null;
            }
            if (faceMeshRef.current) {
                try { await faceMeshRef.current.close(); } catch (e) { console.error("Error closing old FaceMesh:", e); }
                faceMeshRef.current = null;
            }

            console.log("🧠 [useMagicMirror] AI 모델 초기화 시작...");

            // SelfieSegmentation
            const selfieSolution = new window.SelfieSegmentation({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`
            });
            selfieSolution.setOptions({ modelSelection: 1 });
            selfieSolution.onResults((results: any) => {
                window.lastSegmentationResult = results;
                // [Optimization] 실루엣 모드일 때는 여기서 직접 렌더링 트리거 (FaceMesh 스킵)
                if (modeRef.current === 2) {
                    onResults(results);
                }
            });
            selfieSegmentationRef.current = selfieSolution;

            // FaceMesh
            const faceMeshSolution = new window.FaceMesh({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
            });
            faceMeshSolution.setOptions({
                maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
            });
            faceMeshSolution.onResults((results: any) => {
                // 실루엣 모드가 아닐 때만 FaceMesh 결과로 렌더링
                if (modeRef.current !== 2) {
                    onResults(results);
                }
            });
            faceMeshRef.current = faceMeshSolution;

            console.log("✅ [useMagicMirror] AI 모델 로딩 완료");
            setIsLoaded(true);

            processFrame();
        };

        const loadScriptsAndInit = async () => {
            const scripts = [
                "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js",
                "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js",
                "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js",
                "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js"
            ];

            for (const src of scripts) {
                if (!document.querySelector(`script[src="${src}"]`)) {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = src;
                        script.crossOrigin = "anonymous";
                        script.onload = resolve;
                        document.body.appendChild(script);
                    });
                }
            }
            if (isMounted) initModels();
        };

        // 실행 순서: 카메라 시작 -> 스크립트 로드 -> 모델 초기화 -> 프레임 루프
        startCamera().then(() => {
            if (isMounted) loadScriptsAndInit();
        });

        return () => {
            isMounted = false;
            console.log(" [useMagicMirror] Cleanup...");

            // 1. Loop 중단
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            // 2. Stream 정지
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // 3. AI 모델 리소스 해제 (중요: WASM 메모리 누수 방지)
            if (selfieSegmentationRef.current) {
                try { selfieSegmentationRef.current.close(); } catch (e) { console.error("Error closing SelfieSegmentation:", e); }
                selfieSegmentationRef.current = null;
            }
            if (faceMeshRef.current) {
                try { faceMeshRef.current.close(); } catch (e) { console.error("Error closing FaceMesh:", e); }
                faceMeshRef.current = null;
            }
        };
    }, []);

    // 3. Canvas에서 스트림 추출
    useEffect(() => {
        if (!outputCanvasRef.current || !isLoaded) {
            console.log("⏳ [useMagicMirror] Waiting for canvas or isLoaded... isLoaded:", isLoaded);
            return;
        }

        const canvas = outputCanvasRef.current;

        // [FIX] Canvas 크기 검증 - 0x0 해상도 방지
        if (canvas.width === 0 || canvas.height === 0) {
            console.warn("⚠️ [useMagicMirror] Canvas not ready (0x0 dimensions), skipping stream capture");
            setIsStreamReady(false);
            return;
        }

        console.log("📡 [useMagicMirror] Canvas ready, capturing stream...", { width: canvas.width, height: canvas.height });

        // [FIX] requestAnimationFrame으로 최소 1프레임 렌더링 보장
        requestAnimationFrame(() => {
            try {
                const stream = canvas.captureStream(60);
                if (stream && stream.active) {
                    const track = stream.getVideoTracks()[0];
                    if (track && track.readyState === 'live') {
                        console.log("✅ [useMagicMirror] Stream captured successfully:", track.id,
                            "Settings:", track.getSettings());
                        setMaskedStream(stream);
                        setIsStreamReady(true); // ⭐ 스트림 준비 완료!
                    } else {
                        console.error("❌ [useMagicMirror] Invalid track state");
                        setIsStreamReady(false);
                    }
                } else {
                    console.error("❌ [useMagicMirror] captureStream returned null or inactive");
                    setIsStreamReady(false);
                }
            } catch (e) {
                console.error("❌ [useMagicMirror] captureStream failed:", e);
                setIsStreamReady(false);
            }
        });
    }, [isLoaded]);

    return {
        canvasRef: outputCanvasRef as React.RefObject<HTMLCanvasElement>,
        maskedStream,
        isStreamReady, // ⭐ 스트림 준비 상태 노출
        setMode,
        currentMode: currentModeName,
        isLoaded,
        isFaceDetected
    };
};