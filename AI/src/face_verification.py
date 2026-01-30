import mediapipe as mp
import cv2
import numpy as np
from deepface import DeepFace
import os
import json
import tensorflow as tf


class RoundyVision:
    def __init__(self, model_name="ArcFace"):
        # 📍 GPU 관련 설정 추가 (메모리 점진적 할당)
        self._initialize_gpu()

        self.model_name = model_name
        self.reference_cache = {}  # 기준 이미지 크롭본 캐싱
        print(f"✅ RoundyVision 통합 모듈 초기화 완료 (Model: {self.model_name})")

    def _initialize_gpu(self):
        """GPU 가속 활성화 및 메모리 관리 설정"""
        # TensorFlow 로그 레벨 조정 (불필요한 로그 출력 방지)
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

        try:
            gpus = tf.config.list_physical_devices('GPU')
            if gpus:
                for gpu in gpus:
                    # GPU 메모리를 한꺼번에 다 잡지 않고 필요할 때만 늘려가며 사용
                    tf.config.experimental.set_memory_growth(gpu, True)
                print(f"🚀 GPU 가속 활성화 성공: {gpus[0].name}")
            else:
                print("💡 사용 가능한 GPU를 찾지 못했습니다. CPU 모드로 동작합니다.")
        except Exception as e:
            print(f"⚠️ GPU 설정 중 오류 발생: {e}")

    def check_image_quality(self, img):
        """이미지의 밝기와 대비를 체크합니다."""
        if img is None: return 0, 0
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return np.mean(gray), np.std(gray)

    def get_face_crop_manual(self, img, landmarks):
        """MediaPipe 랜드마크 기반 정밀 크롭 (백업용)"""
        try:
            h, w = img.shape[:2]
            if isinstance(landmarks, str):
                landmarks = json.loads(landmarks)

            pts = np.array([[lm['x'] * w, lm['y'] * h] for lm in landmarks])
            min_x, min_y = np.min(pts, axis=0)
            max_x, max_y = np.max(pts, axis=0)

            margin_w = (max_x - min_x) * 0.3
            margin_h = (max_y - min_y) * 0.3

            x1, y1 = int(max(0, min_x - margin_w)), int(max(0, min_y - margin_h))
            x2, y2 = int(min(w, max_x + margin_w)), int(min(h, max_y + margin_h))

            return img[y1:y2, x1:x2]
        except Exception:
            return img

    def extract_face_robust(self, img, preferred_backend='retinaface'):
        """제공된 이미지에서 가장 정밀한 모델로 얼굴을 추출합니다."""
        backends = [preferred_backend, 'mediapipe', 'mtcnn', 'opencv']

        for backend in backends:
            try:
                face_objs = DeepFace.extract_faces(
                    img_path=img,
                    detector_backend=backend,
                    enforce_detection=True,
                    align=True
                )
                if face_objs:
                    face_img = (face_objs[0]['face'] * 255).astype('uint8')
                    face_img = cv2.cvtColor(face_img, cv2.COLOR_RGB2BGR)
                    return face_img, backend
            except Exception:
                continue
        return None, None

    def get_reference_face(self, path):
        """기준 이미지에서 얼굴을 추출하여 캐싱합니다."""
        if path in self.reference_cache:
            return self.reference_cache[path]

        face_img, backend = self.extract_face_robust(path, 'retinaface')
        if face_img is not None:
            self.reference_cache[path] = face_img
            debug_path = os.path.join(os.path.dirname(path), f"debug_ref_face_{backend}.jpg")
            cv2.imwrite(debug_path, face_img)
            return face_img

        raw_img = cv2.imread(path)
        return raw_img

    def verify_face(self, img1, img2_path, threshold=0.4, landmarks=None):
        """정밀 정렬 및 안면 인증 수행"""
        try:
            # 1. 캡처 이미지 품질 검사
            brightness, contrast = self.check_image_quality(img1)
            if brightness < 35 or contrast < 12:
                return {"verified": False, "distance": None, "error": "사진이 너무 어둡거나 흐릿합니다."}

            # 2. 기준 이미지 얼굴 확보 (캐싱됨)
            ref_face = self.get_reference_face(img2_path)
            if ref_face is None:
                return {"verified": False, "distance": None, "error": "기준 파일을 읽을 수 없습니다."}

            # 3. 실시간 캡처 사진도 retinaface로 정밀 추출
            cap_face, backend = self.extract_face_robust(img1, 'retinaface')

            if cap_face is not None:
                img1 = cap_face
                cv2.imwrite("asset/debug/debug_cap_face_refined.jpg", img1)
            elif landmarks is not None:
                img1 = self.get_face_crop_manual(img1, landmarks)
                cv2.imwrite("asset/debug/debug_cap_face_manual.jpg", img1)

            # 4. DeepFace 비교 (ArcFace + GPU 가속 활용)
            result = DeepFace.verify(
                img1_path=img1,
                img2_path=ref_face,
                model_name=self.model_name,
                detector_backend='skip',
                distance_metric='cosine',
                enforce_detection=False,
                align=True
            )

            dist = result.get('distance')
            is_verified = bool(dist <= threshold) if dist is not None else False

            return {
                "verified": is_verified,
                "distance": dist,
                "model": self.model_name,
                "gpu_accelerated": len(tf.config.list_physical_devices('GPU')) > 0
            }

        except Exception as e:
            print(f"⚠️ 분석 실패: {e}")
            return {"verified": False, "distance": None, "error": str(e)}