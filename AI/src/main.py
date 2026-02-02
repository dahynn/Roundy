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


@app.route('/verify', methods=['POST'])
def verify():
    # if not os.path.exists(REFERENCE_PATH):
    #    return jsonify({"error": "Reference image not found."}), 500

    file = request.files['realtimeImage']
    ref_file = request.files['originalImage']
    # landmarks_json = request.form.get('landmarks') # Removed

    img_array = np.frombuffer(file.read(), np.uint8)
    captured_img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    ref_array = np.frombuffer(ref_file.read(), np.uint8)
    ref_img = cv2.imdecode(ref_array, cv2.IMREAD_COLOR)

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


if __name__ == "__main__":
    print(f"🚀 Roundy AI Server is running...")
    app.run(host='0.0.0.0', port=8000, debug=True)