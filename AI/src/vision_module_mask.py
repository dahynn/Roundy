import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import numpy as np
from deepface import DeepFace
import os

class RoundyVision:
    def __init__(self, segmenter_path, landmarker_path, model_name="ArcFace"):
        # 1. 모델 파일 존재 여부 확인
        if not os.path.exists(segmenter_path) or not os.path.exists(landmarker_path):
            raise FileNotFoundError("모델 파일을 찾을 수 없습니다. 경로를 확인해주세요.")

        # 2. MediaPipe Image Segmenter 설정 (실시간 필터용)
        base_options_seg = python.BaseOptions(model_asset_path=segmenter_path)
        self.segmenter = vision.ImageSegmenter.create_from_options(
            vision.ImageSegmenterOptions(
                base_options=base_options_seg,
                running_mode=vision.RunningMode.IMAGE,
                output_category_mask=True
            )
        )

        # 3. MediaPipe Face Landmarker 설정 (최신 Tasks API 방식)
        base_options_face = python.BaseOptions(model_asset_path=landmarker_path)
        self.landmarker = vision.FaceLandmarker.create_from_options(
            vision.FaceLandmarkerOptions(
                base_options=base_options_face,
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1
            )
        )

        self.model_name = model_name
        print(f"✅ RoundyVision 초기화 완료 (MediaPipe Tasks API 적용)")

    def verify_face(self, img1, img2, threshold):
        """
        Numpy 배열로 된 두 이미지를 비교합니다.
        img1: 캡처된 이미지 (ndarray)
        img2: 기준 이미지 (ndarray)
        """
        try:
            if img1 is None or img2 is None:
                return {"error": "이미지 데이터가 없습니다."}

            # 1. MediaPipe Tasks용 RGB 변환 및 이미지 생성
            img1_rgb = cv2.cvtColor(img1.astype('uint8'), cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img1_rgb)

            # 2. 얼굴 감지 수행 (Tasks API)
            detection_result = self.landmarker.detect(mp_image)

            if not detection_result.face_landmarks:
                return {"error": "얼굴을 찾을 수 없습니다. 카메라를 정면으로 바라봐 주세요."}

            print(f"🧐 얼굴 감지 성공! {self.model_name} 모델로 정밀 비교 중...")

            # 3. DeepFace 비교 실행
            # img1_path에 배열을 직접 전달할 수 있습니다.
            result = DeepFace.verify(
                img1_path=img1,
                img2_path=img2,
                model_name=self.model_name,
                detector_backend='opencv',
                distance_metric='cosine',
                enforce_detection=False,
                align=True
            )

            result['verified'] = bool(result['distance'] <= threshold)
            result['detector_backend'] = 'mediapipe_tasks'

            print(f"✨ 분석 완료! 거리: {result['distance']:.4f}")
            return result

        except Exception as e:
            error_msg = str(e)
            print(f"⚠️ 시스템 예외 발생: {error_msg}")
            return {"error": f"분석 중 오류 발생: {error_msg}"}

    def get_person_mask(self, frame):
        """MediaPipe를 이용한 인물 마스크 추출"""
        if frame is None: return None
        rgb_frame = cv2.cvtColor(frame.astype('uint8'), cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        return self.segmenter.segment(mp_image).category_mask.numpy_view()

    def apply_silhouette(self, frame, mask):
        """인물 실루엣 필터 적용"""
        mask_2d = np.squeeze(mask)
        out_frame = frame.copy().astype('uint8')
        out_frame[mask_2d <= 0.1] = [255, 255, 255]
        out_frame[mask_2d > 0.1] = [0, 0, 0]
        return out_frame