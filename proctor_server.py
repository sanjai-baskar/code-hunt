import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

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
        
        direction = "center"
        face_found = False
        
        if results.multi_face_landmarks:
            face_found = True
            landmarks = results.multi_face_landmarks[0].landmark
            
            # Key landmarks for gaze
            nose = landmarks[1]
            left_eye = landmarks[133]
            right_eye = landmarks[362]
            top_head = landmarks[10]
            chin = landmarks[152]
            
            # 1. Yaw (Left/Right)
            eyes_mid_x = (left_eye.x + right_eye.x) / 2
            yaw = (nose.x - eyes_mid_x) / (right_eye.x - left_eye.x)
            
            # 2. Pitch (Up)
            face_height = chin.y - top_head.y
            nose_rel_y = (nose.y - top_head.y) / face_height if face_height != 0 else 0.5
            
            if yaw < -0.4: direction = "left"
            elif yaw > 0.4: direction = "right"
            elif nose_rel_y < 0.35: direction = "up"
            
        else:
            direction = "away"

        return {
            "face_found": face_found,
            "direction": direction,
            "count": len(results.multi_face_landmarks) if results.multi_face_landmarks else 0
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print("AI Proctoring Server (Python) starting on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
