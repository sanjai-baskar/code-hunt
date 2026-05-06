import React, { useRef, useEffect, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { useFaceMonitor } from '../hooks/useFaceMonitor';

export default function WebcamMonitor({ onDistraction, getCode, problemId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const predictionsRef = useRef([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [objectModel, setObjectModel] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 240 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { processDetection } = useFaceMonitor({ onDistraction, getCode, problemId });

  // Initialize Models
  useEffect(() => {
    const initModels = async () => {
      try {
        try {
          await tf.setBackend('webgl');
        } catch (e) {
          await tf.setBackend('cpu');
        }

        const model = await cocoSsd.load();
        setObjectModel(model);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model loading failed:", err);
        setError('Failed to load AI models');
      }
    };
    initModels();
  }, []);

  // Initialize MediaPipe FaceMesh and Camera
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current || !canvasRef.current) return;

    let faceMesh;
    let camera;

    const setupMediaPipe = async () => {
      try {
        // @ts-ignore
        faceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        faceMesh.onResults((results) => {
          drawFrame(results);
          processDetection(results, predictionsRef.current);
        });

        // @ts-ignore
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              await faceMesh.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        await camera.start();
        setStreamActive(true);
      } catch (err) {
        console.error("MediaPipe setup failed:", err);
        setError('Camera initialization failed');
        if (onDistraction) onDistraction('camera-off');
      }
    };

    setupMediaPipe();

    return () => {
      if (camera) camera.stop();
      if (faceMesh) faceMesh.close();
    };
  }, [modelsLoaded, processDetection]);

  // Object Detection Loop
  useEffect(() => {
    if (!streamActive || !objectModel) return;

    let timeoutId;
    const runDetection = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const predictions = await objectModel.detect(videoRef.current);
          predictionsRef.current = predictions;
        } catch (err) {
          console.error("Object detection error:", err);
        }
      }
      timeoutId = setTimeout(runDetection, 1500);
    };

    runDetection();
    return () => clearTimeout(timeoutId);
  }, [streamActive, objectModel]);

  const drawFrame = (results) => {
    const canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw Face Mesh
    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        // @ts-ignore
        window.drawConnectors(canvasCtx, landmarks, window.FACEMESH_TESSELATION, { color: '#C0C0C040', lineWidth: 1 });
        // @ts-ignore
        window.drawConnectors(canvasCtx, landmarks, window.FACEMESH_RIGHT_EYE, { color: '#ffa116', lineWidth: 2 });
        // @ts-ignore
        window.drawConnectors(canvasCtx, landmarks, window.FACEMESH_LEFT_EYE, { color: '#ffa116', lineWidth: 2 });
      }
    }

    // Draw Objects
    predictionsRef.current.forEach(pred => {
      if (pred.score > 0.4 && pred.class !== "person") {
        const [x, y, width, height] = pred.bbox;
        canvasCtx.strokeStyle = "#ffa116";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(x, y, width, height);
        canvasCtx.fillStyle = "#ffa116";
        canvasCtx.font = "12px Inter";
        canvasCtx.fillText(`${pred.class} (${Math.round(pred.score * 100)}%)`, x, y > 10 ? y - 5 : 10);
      }
    });
  };

  // Draggable Logic
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const move = (e) => isDragging && setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [isDragging, dragOffset]);

  return (
    <div className="webcam-monitor w-[160px] md:w-[220px]" style={{ left: position.x, top: position.y }} onMouseDown={handleMouseDown}>
      <div className="webcam-inner">
        <div className="webcam-header">
          <div className="flex items-center gap-1.5">
             <div className={`w-2 h-2 rounded-full ${streamActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
             <span>AI Proctoring</span>
          </div>
          <span className="opacity-40">Active</span>
        </div>
        <div className="relative aspect-video bg-black">
          {error && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-500 p-2 text-center bg-black/80 z-20">{error}</div>}
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover scale-x-[-1]" 
            style={{ display: streamActive ? 'block' : 'none' }}
          />
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10 pointer-events-none" 
          />
          {!streamActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--leetcode-orange)] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] text-[var(--text-muted)]">Starting Camera...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
