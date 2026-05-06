import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import base64

app = FastAPI()

# Enable CORS for the frontend
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
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"error": "Invalid image"}

    # Convert to RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(img_rgb)
    
    direction = "center"
    face_found = False
    
    if results.multi_face_landmarks:
        face_found = True
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Nose, Eyes, etc.
        nose = landmarks[1]
        left_eye = landmarks[133]
        right_eye = landmarks[362]
        
        # Simple yaw estimation
        eyes_mid_x = (left_eye.x + right_eye.x) / 2
        yaw = (nose.x - eyes_mid_x) / (right_eye.x - left_eye.x)
        
        if yaw < -0.4: direction = "left"
        elif yaw > 0.4: direction = "right"
        
    else:
        direction = "away"

    return {
        "face_found": face_found,
        "direction": direction,
        "count": len(results.multi_face_landmarks) if results.multi_face_landmarks else 0
    }

if __name__ == "__main__":
    print("AI Proctoring Server running on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
