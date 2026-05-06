import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { useFaceMonitor } from '../hooks/useFaceMonitor';

const RESTRICTED = ["cell phone", "laptop", "tablet", "book", "remote", "keyboard", "mouse"];

export default function WebcamMonitor({ onDistraction, getCode, problemId }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const modelRef    = useRef(null);       // COCO-SSD model ref
  const predsRef    = useRef([]);         // latest predictions ref (no state = no re-render)
  const detLoopRef  = useRef(null);       // detection interval id

  const [streamActive, setStreamActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 240 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { processDetection } = useFaceMonitor({ onDistraction, getCode, problemId });

  // ── 1. Load TF + COCO-SSD once ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        try { await tf.setBackend('webgl'); } catch { await tf.setBackend('cpu'); }
        await tf.ready();
        modelRef.current = await cocoSsd.load();
        console.log('[AI] COCO-SSD ready');
        setModelsLoaded(true);
      } catch (e) {
        console.error('[AI] COCO-SSD load failed', e);
        setError('Failed to load detection model');
      }
    })();
  }, []);

  // ── 2. Separate object-detection loop (does NOT touch MediaPipe pipeline) ─
  //    Starts after streamActive=true. Runs every 1 s independently.
  useEffect(() => {
    if (!streamActive) return;

    const runDetection = async () => {
      const video = videoRef.current;
      if (!video || !modelRef.current || video.readyState < 2 || video.paused) return;
      try {
        const preds = await modelRef.current.detect(video);
        predsRef.current = preds;
        const found = preds.filter(p => p.score > 0.35);
        if (found.length) {
          console.log('[COCO-SSD]', found.map(p => `${p.class} ${Math.round(p.score * 100)}%`).join(' | '));
        }
      } catch { /* silent */ }
    };

    // Kick off first detection once, then repeat every 1000ms
    runDetection();
    detLoopRef.current = setInterval(runDetection, 1000);

    return () => {
      clearInterval(detLoopRef.current);
      detLoopRef.current = null;
    };
  }, [streamActive]);

  // ── 3. Draw face mesh + bounding boxes (called from onResults, every frame) ─
  const drawFrame = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Face mesh
    if (results.multiFaceLandmarks) {
      for (const lm of results.multiFaceLandmarks) {
        // @ts-ignore
        window.drawConnectors(ctx, lm, window.FACEMESH_TESSELATION, { color: '#C0C0C028', lineWidth: 1 });
        // @ts-ignore
        window.drawConnectors(ctx, lm, window.FACEMESH_RIGHT_EYE, { color: '#ffa116', lineWidth: 1.5 });
        // @ts-ignore
        window.drawConnectors(ctx, lm, window.FACEMESH_LEFT_EYE, { color: '#ffa116', lineWidth: 1.5 });
        // @ts-ignore
        window.drawConnectors(ctx, lm, window.FACEMESH_FACE_OVAL, { color: '#66FCF118', lineWidth: 1 });
      }
    }

    // Object bounding boxes from latest predsRef (not state — no flicker)
    predsRef.current.forEach(pred => {
      if (pred.score < 0.35) return;
      const [x, y, w, h] = pred.bbox;
      const restricted = RESTRICTED.includes(pred.class);
      const color = restricted ? '#ef4743' : '#ffa116';
      const label = `${pred.class} ${Math.round(pred.score * 100)}%`;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.font = 'bold 11px Arial';
      const tw = ctx.measureText(label).width + 8;
      const ly = y > 20 ? y - 16 : y + h + 2;
      ctx.fillStyle = color;
      ctx.fillRect(x, ly, tw, 16);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 4, ly + 12);
    });
  }, []);

  // ── 4. MediaPipe FaceMesh — onFrame only sends to face mesh, nothing else ─
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current || !canvasRef.current) return;

    let faceMesh;
    let camera;

    (async () => {
      try {
        // @ts-ignore
        faceMesh = new window.FaceMesh({
          locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults(results => {
          drawFrame(results);
          processDetection(results, predsRef.current);
        });

        // @ts-ignore
        camera = new window.Camera(videoRef.current, {
          // onFrame ONLY sends to face mesh — no blocking calls
          onFrame: async () => {
            if (faceMesh && videoRef.current) {
              await faceMesh.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();

        // Set canvas size ONCE after camera starts (not every frame)
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas && video) {
          // Wait briefly for video dimensions to be available
          await new Promise(r => setTimeout(r, 500));
          canvas.width  = video.videoWidth  || 640;
          canvas.height = video.videoHeight || 480;
        }

        setStreamActive(true);
      } catch (err) {
        console.error('[AI] MediaPipe setup failed:', err);
        setError('Camera failed to start');
        if (onDistraction) onDistraction('camera-off');
      }
    })();

    return () => {
      if (camera)   camera.stop();
      if (faceMesh) faceMesh.close();
    };
  }, [modelsLoaded, drawFrame, processDetection, onDistraction]);

  // ── 5. Draggable ──────────────────────────────────────────────────────────
  const handleMouseDown = e => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  useEffect(() => {
    const move = e => isDragging && setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const up   = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [isDragging, dragOffset]);

  // ── 6. Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="webcam-monitor w-[160px] md:w-[220px]"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="webcam-inner">
        <div className="webcam-header">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${streamActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
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

          {/* Raw webcam feed */}
          <video
            ref={videoRef}
            autoPlay muted playsInline
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />

          {/* Canvas overlay — face mesh + object boxes drawn here */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full scale-x-[-1] z-10 pointer-events-none"
            style={{ objectFit: 'cover' }}
          />

          {/* Loading overlay */}
          {!streamActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 z-20">
              <div className="w-5 h-5 border-2 border-[#ffa116] border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] text-gray-400">Loading AI...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
