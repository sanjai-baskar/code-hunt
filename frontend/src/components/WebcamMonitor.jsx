import React, { useRef, useEffect, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { useFaceMonitor } from '../hooks/useFaceMonitor';

const RESTRICTED = ["cell phone", "laptop", "tablet", "book", "remote", "keyboard", "mouse"];

export default function WebcamMonitor({ onDistraction, getCode, problemId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const predictionsRef = useRef([]);
  const objectModelRef = useRef(null);
  const frameCountRef = useRef(0);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 240 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { processDetection } = useFaceMonitor({ onDistraction, getCode, problemId });

  // ── 1. Load COCO-SSD model ────────────────────────────────────────────────
  useEffect(() => {
    const initModels = async () => {
      try {
        try { await tf.setBackend('webgl'); } catch { await tf.setBackend('cpu'); }
        await tf.ready();
        const model = await cocoSsd.load();
        objectModelRef.current = model;
        setModelsLoaded(true);
        console.log('[AI] COCO-SSD model loaded');
      } catch (err) {
        console.error('[AI] Model loading failed:', err);
        setError('Failed to load AI models');
      }
    };
    initModels();
  }, []);

  // ── 2. Setup MediaPipe FaceMesh + Camera ──────────────────────────────────
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current || !canvasRef.current) return;

    let faceMesh;
    let camera;

    const setup = async () => {
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

        // Called every frame with face detection results
        faceMesh.onResults((results) => {
          drawFrame(results);
          processDetection(results, predictionsRef.current);
        });

        // @ts-ignore
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || !faceMesh) return;

            // Fix blinking: only resize canvas when dimensions actually change
            if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }

            // Send frame to MediaPipe
            await faceMesh.send({ image: video });

            // Run COCO-SSD every 15 frames (~500ms at 30fps)
            // Running inside onFrame guarantees the video element has fresh data
            frameCountRef.current++;
            if (frameCountRef.current % 15 === 0 && objectModelRef.current) {
              try {
                const preds = await objectModelRef.current.detect(video);
                predictionsRef.current = preds;
                const interesting = preds.filter(p => p.score > 0.35);
                if (interesting.length > 0) {
                  console.log('[COCO-SSD]', interesting.map(p => `${p.class} ${Math.round(p.score * 100)}%`).join(' | '));
                }
              } catch {
                // silently continue on detection error
              }
            }
          },
          width: 640,
          height: 480
        });

        await camera.start();
        setStreamActive(true);
      } catch (err) {
        console.error('[AI] MediaPipe setup failed:', err);
        setError('Camera initialization failed');
        if (onDistraction) onDistraction('camera-off');
      }
    };

    setup();

    return () => {
      if (camera) camera.stop();
      if (faceMesh) faceMesh.close();
    };
  }, [modelsLoaded, processDetection, onDistraction]);

  // ── 3. Draw face mesh + object bounding boxes ─────────────────────────────
  const drawFrame = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw face mesh tessellation and eye outlines
    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        // @ts-ignore
        window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, { color: '#C0C0C030', lineWidth: 1 });
        // @ts-ignore
        window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE, { color: '#ffa116', lineWidth: 1.5 });
        // @ts-ignore
        window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE, { color: '#ffa116', lineWidth: 1.5 });
        // @ts-ignore
        window.drawConnectors(ctx, landmarks, window.FACEMESH_FACE_OVAL, { color: '#66FCF130', lineWidth: 1 });
      }
    }

    // Draw object detection bounding boxes
    predictionsRef.current.forEach(pred => {
      if (pred.score < 0.35) return;

      const [x, y, w, h] = pred.bbox;
      const isRestricted = RESTRICTED.includes(pred.class);
      const color = isRestricted ? '#ef4743' : '#ffa116';
      const label = `${pred.class} ${Math.round(pred.score * 100)}%`;

      // Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Label background + text
      ctx.font = 'bold 11px Arial';
      const textW = ctx.measureText(label).width + 8;
      const labelY = y > 18 ? y - 16 : y + h + 2;
      ctx.fillStyle = color;
      ctx.fillRect(x, labelY, textW, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 4, labelY + 12);
    });
  };

  // ── 4. Draggable ──────────────────────────────────────────────────────────
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

  // ── 5. Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="webcam-monitor w-[160px] md:w-[220px]"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="webcam-inner">
        <div className="webcam-header">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${streamActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>AI Proctoring</span>
          </div>
          <span className="opacity-50 text-[9px]">{streamActive ? 'LIVE' : '...'}</span>
        </div>

        <div className="relative aspect-video bg-black overflow-hidden">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 p-2 text-center bg-black/90 z-20">
              {error}
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />

          {/* Canvas overlay for face mesh + object boxes */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full scale-x-[-1] z-10 pointer-events-none"
            style={{ objectFit: 'cover' }}
          />

          {/* Loading spinner */}
          {!streamActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
              <div className="w-6 h-6 border-2 border-[var(--leetcode-orange)] border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] text-gray-400">Loading AI...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
