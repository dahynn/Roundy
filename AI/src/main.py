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

# Initialize AI Module
vision = RoundyVision()


@app.route('/verify', methods=['POST'])
def verify():
    if 'image' not in request.files or 'reference_image' not in request.files:
        return jsonify({"error": "Both 'image' and 'reference_image' must be provided."}), 400

    file_cap = request.files['image']
    file_ref = request.files['reference_image']
    landmarks_json = request.form.get('landmarks')

    # 1. Decode Captured Image (Target)
    img_array_cap = np.frombuffer(file_cap.read(), np.uint8)
    captured_img = cv2.imdecode(img_array_cap, cv2.IMREAD_COLOR)

    # 2. Decode Reference Image (Source)
    img_array_ref = np.frombuffer(file_ref.read(), np.uint8)
    reference_img = cv2.imdecode(img_array_ref, cv2.IMREAD_COLOR)

    try:
        # Strict threshold for security
        result = vision.verify_face(
            img1=captured_img,
            img2_source=reference_img,
            threshold=0.4,
            landmarks=landmarks_json
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


if __name__ == "__main__":
    print(f"🚀 Roundy AI Server is running...")
    app.run(host='0.0.0.0', port=8000, debug=True)