from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
from face_verification import RoundyVision

app = Flask(__name__)
CORS(app)

# --- Path Configuration ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
ASSET_DIR = os.path.join(PROJECT_ROOT, "asset")
REFERENCE_PATH = os.path.join(ASSET_DIR, "reference1.jpg")

# Initialize AI Module
vision = RoundyVision()


@app.route('/healthz', methods=['GET'])
def healthz():
    return jsonify({"status": "UP"})


@app.route('/verify', methods=['POST'])
def verify():
    # if not os.path.exists(REFERENCE_PATH):
    #    return jsonify({"error": "Reference image not found."}), 500

    file = request.files.get('realtimeImage')
    ref_file = request.files.get('originalImage')
    if file is None or ref_file is None:
        return jsonify({"error": "realtimeImage와 originalImage 파일이 필요합니다."}), 400

    # landmarks_json = request.form.get('landmarks') # Removed

    img_array = np.frombuffer(file.read(), np.uint8)
    captured_img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    ref_array = np.frombuffer(ref_file.read(), np.uint8)
    ref_img = cv2.imdecode(ref_array, cv2.IMREAD_COLOR)
    if captured_img is None or ref_img is None:
        return jsonify({"error": "이미지 파일을 읽을 수 없습니다."}), 400

    try:
        # Strict threshold for security
        result = vision.verify_face(
            img1=captured_img,
            img2=ref_img,
            threshold=0.4
            # landmarks=landmarks_json # Removed
        )

        # --- 📍 CRITICAL FIX: Safe Logging ---
        # Prevent "NoneType.__format__" error by checking if distance exists
        dist = result.get('distance')
        dist_display = f"{dist:.4f}" if dist is not None else "N/A"

        print("\n" + "=" * 40)
        print(f"📊 [Verification Result]: {result.get('verified', False)}")
        print(f"📏 [Distance Score]: {dist_display}")
        if "error" in result:
            print(f"⚠️ [Error]: {result['error']}")
        print("=" * 40 + "\n")

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def warmup_gpu():
    """서버 시작 시 GPU 및 모델 웜업"""
    print("\n🔥 GPU 웜업 시작...")
    try:
        # 더미 이미지 생성 (100x100 RGB)
        dummy_img1 = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        dummy_img2 = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        # 한 번 검증 수행 (모델 로딩 및 GPU 메모리 할당)
        vision.verify_face(dummy_img1, dummy_img2, threshold=0.4)
        
        print("✅ GPU 웜업 완료! 모델이 메모리에 로드되었습니다.\n")
    except Exception as e:
        print(f"⚠️ 웜업 중 오류 발생 (무시 가능): {e}\n")


if __name__ == "__main__":
    print("Roundy AI Server is running...")
    warmup_gpu()
    app.run(host='0.0.0.0', port=8000, debug=False)
