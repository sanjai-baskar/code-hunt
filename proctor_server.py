import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=2, # Detect up to 2 to catch "multiple_faces" violation
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Load COCO-SSD for mobile phone detection
# Note: In a real production env, you'd use a faster YOLOv8 model, 
# but for this script we'll stick to a basic Haar Cascade or similar if needed,
# or simply assume we're focusing on the FaceMesh logic as the core engine.
# For this implementation, we will use the FaceMesh landmarks to detect 'talking' and 'face_hidden'.

def calculate_angle(p1, p2):
    return math.degrees(math.atan2(p2.y - p1.y, p2.x - p1.x))

@app.post("/process")
async def process_frame(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Invalid image"}

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(img_rgb)
        
        response = {
            "faces_detected": 0,
            "face_position": "not_visible",
            "gaze_direction": "unknown",
            "head_tilt_angle": 0,
            "violations": [],
            "status": "normal",
            "confidence": 0.0
        }

        if not results.multi_face_landmarks:
            response["status"] = "violation"
            response["violations"].append("no_face_detected")
            return response

        faces = results.multi_face_landmarks
        response["faces_detected"] = len(faces)
        response["confidence"] = 0.95

        # 1. Multiple Faces Check
        if len(faces) > 1:
            response["status"] = "violation"
            response["violations"].append("multiple_faces")

        # Analyze the primary face (index 0)
        landmarks = faces[0].landmark
        
        # Landmarks: Nose=1, L-Eye=133, R-Eye=362, Top=10, Chin=152, L-Mouth=61, R-Mouth=291
        nose = landmarks[1]
        left_eye = landmarks[133]
        right_eye = landmarks[362]
        top_head = landmarks[10]
        chin = landmarks[152]
        
        # Face Position / Gaze (Yaw)
        eyes_mid_x = (left_eye.x + right_eye.x) / 2
        yaw = (nose.x - eyes_mid_x) / (right_eye.x - left_eye.x)
        
        # Face Position / Gaze (Pitch)
        face_height = chin.y - top_head.y
        pitch = (nose.y - top_head.y) / face_height if face_height != 0 else 0.5

        # Determine Position & Gaze
        if yaw < -0.45:
            response["face_position"] = "right"
            response["gaze_direction"] = "right"
            response["violations"].append("looking_away")
        elif yaw > 0.45:
            response["face_position"] = "left"
            response["gaze_direction"] = "left"
            response["violations"].append("looking_away")
        elif pitch < 0.35:
            response["face_position"] = "up"
            response["gaze_direction"] = "up"
            response["violations"].append("looking_away")
        else:
            response["face_position"] = "center"
            response["gaze_direction"] = "center"

        # Head Tilt (Roll)
        # Angle between eyes
        tilt = calculate_angle(left_eye, right_eye)
        response["head_tilt_angle"] = round(abs(tilt), 1)
        
        if abs(tilt) > 25:
            response["violations"].append("head_pose_suspicious")
            if response["status"] == "normal": response["status"] = "suspicious"

        # Detect Talking (Mouth Distance)
        upper_lip = landmarks[13]
        lower_lip = landmarks[14]
        mouth_dist = abs(upper_lip.y - lower_lip.y)
        if mouth_dist > 0.05: # Threshold for open mouth
            response["violations"].append("talking")
            if response["status"] == "normal": response["status"] = "suspicious"

        # Final Status Decision
        if len(response["violations"]) >= 2:
            response["status"] = "violation"
        elif len(response["violations"]) == 1 and response["status"] == "normal":
            response["status"] = "suspicious"

        return response

    except Exception as e:
        return {"error": str(e), "status": "violation"}

if __name__ == "__main__":
    print("STRICT AI Proctoring Engine starting on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
