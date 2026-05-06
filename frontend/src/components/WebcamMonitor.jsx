import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { useFaceMonitor } from '../hooks/useFaceMonitor';

export default function WebcamMonitor({ onDistraction, getCode, problemId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [objectModel, setObjectModel] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { processDetection } = useFaceMonitor({ onDistraction, getCode, problemId });

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          cocoSsd.load().then(model => setObjectModel(model))
        ]);
        setModelsLoaded(true);
      } catch (err) {
        setModelsLoaded(true);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!modelsLoaded) return;
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } catch (err) {
        setError('Camera access denied');
      }
    };
    startVideo();
  }, [modelsLoaded]);

  useEffect(() => {
    if (!streamActive) return;
    let frameId;
    let loopCount = 0;
    const loop = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        // Detect all faces
        const faceDetections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        
        // Detect objects (every 2nd loop = 1s interval)
        let objects = [];
        if (objectModel && loopCount % 2 === 0) {
          objects = await objectModel.detect(videoRef.current);
        }
        loopCount++;

        processDetection(faceDetections, objects);
        if (faceDetections.length > 0 || objects.length > 0) {
          console.log(`[AI Monitor] Faces: ${faceDetections.length}, Objects: ${objects.map(o => o.class).join(', ')}`);
        }
      }
      setTimeout(loop, 500); 
    };
    loop();
    return () => {}; // Cleanup handled by component unmount stopping the stream
  }, [streamActive, processDetection]);

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
    <div className="webcam-monitor" style={{ left: position.x, top: position.y }} onMouseDown={handleMouseDown}>
      <div className="webcam-inner">
        <div className="webcam-header">
          <div className="flex items-center gap-1.5">
             <div className={`w-2 h-2 rounded-full ${streamActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
             <span>Live Focus</span>
          </div>
          <span className="opacity-40">AI</span>
        </div>
        <div className="relative aspect-video bg-black">
          {error && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-500 p-2">{error}</div>}
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
        </div>
      </div>
    </div>
  );
}
