from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
import tensorflow as tf
from vision_module_mask import RoundyVision

# ==========================================
# [환경 및 경로 관리]
# ==========================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET_DIR = os.path.join(BASE_DIR, "asset")

if not os.path.exists(ASSET_DIR):
    os.makedirs(ASSET_DIR)

CONFIG = {
    "SEGMENTER_PATH": os.path.join(ASSET_DIR, "selfie_segmenter.tflite"),
    "LANDMARKER_PATH": os.path.join(ASSET_DIR, "face_landmarker.task"),
    "MODEL_NAME": "ArcFace",
    "REFERENCE_IMAGE": os.path.join(ASSET_DIR, "reference1.jpg"),
    "DEBUG_IMAGE": os.path.join(ASSET_DIR, "debug_received.jpg"),
    "THRESHOLD": 0.4
}

# ==========================================
# [GPU 설정]
# ==========================================
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'


def initialize_gpu():
    """GPU 메모리 증가 설정 (RTX 4050 전용)"""
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            print(f"🚀 GPU 가속 활성화: {gpus[0].name}")
        except RuntimeError as e:
            print(f"⚠️ GPU 설정 오류: {e}")


initialize_gpu()

# AI 모듈 초기화
try:
    vision = RoundyVision(CONFIG["SEGMENTER_PATH"], CONFIG["LANDMARKER_PATH"], CONFIG["MODEL_NAME"])
except Exception as e:
    print(f"❌ AI 모듈 초기화 실패: {e}")
    vision = None

app = Flask(__name__)
CORS(app)


def request_file_to_cv2(file_storage):
    """업로드된 파일 객체를 OpenCV 이미지 객체로 변환"""
    try:
        # 파일을 바이너리로 읽음
        file_bytes = np.frombuffer(file_storage.read(), np.uint8)
        # OpenCV 포맷으로 디코딩
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img is not None:
            # 디버깅용으로 수신 이미지 저장
            cv2.imwrite(CONFIG["DEBUG_IMAGE"], img)

        return img
    except Exception as e:
        print(f"❌ 이미지 변환 실패: {e}")
        return None


@app.route('/verify', methods=['POST'])
def verify():
    if vision is None:
        return jsonify({"error": "AI 모듈이 준비되지 않았습니다."}), 500

    # multipart/form-data에서 'image' 필드 추출
    if 'image' not in request.files:
        return jsonify({"error": "전송된 이미지 파일이 없습니다."}), 400

    image_file = request.files['image']

    # 1. 수신 이미지 변환 (FileStorage -> Numpy Array)
    captured_img = request_file_to_cv2(image_file)
    if captured_img is None:
        return jsonify({"error": "이미지 디코딩에 실패했습니다."}), 400

    # 2. 기준 이미지 존재 확인 및 로드
    if not os.path.exists(CONFIG["REFERENCE_IMAGE"]):
        return jsonify({"error": "서버에 기준 사진(reference1.jpg)이 존재하지 않습니다."}), 500

    reference_img = cv2.imread(CONFIG["REFERENCE_IMAGE"])

    try:
        # 3. AI 안면 인증 수행
        result = vision.verify_face(
            captured_img,
            reference_img,
            CONFIG["THRESHOLD"]
        )

        if "error" in result:
            print(f"⚠️ 인증 실패 사유: {result['error']}")
            return jsonify({"error": result["error"]}), 400

        print(f"✅ 인증 완료 - Distance: {result.get('distance', 0):.4f}")
        return jsonify(result)

    except Exception as e:
        print(f"❌ 서버 내부 처리 오류: {e}")
        return jsonify({"error": "서버 내부에서 오류가 발생했습니다."}), 500


if __name__ == "__main__":
    print(f"🔥 Roundy AI 서버 실행 중... (Port: 8000)")
    app.run(host='0.0.0.0', port=8000)