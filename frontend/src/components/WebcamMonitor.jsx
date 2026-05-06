import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import api from '../api/client';

const RESTRICTED = ["cell phone", "laptop", "tablet", "book", "remote"];
const GRACE_PERIOD = 10000; // 10s grace period before monitoring starts
const DETECTION_INTERVAL = 2500; // Run detection every 2.5s
const SUSTAINED_MS = 5000; // 5s sustained distraction to trigger event

export default function WebcamMonitor({ onDistraction, getCode, problemId }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const modelRef   = useRef(null);
  const streamRef  = useRef(null);
  const mountTime  = useRef(Date.now());

  // Distraction tracking refs (no state = no re-renders)
  const distractionStart = useRef(null);
  const currentDir       = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  // Draggable state
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 240 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ── 1. Start webcam + load model (runs once) ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Get webcam stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
          audio: false
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          // Set canvas size once
          if (canvasRef.current) {
            canvasRef.current.width  = video.videoWidth  || 320;
            canvasRef.current.height = video.videoHeight || 240;
          }
        }
      } catch (err) {
        console.error('[Webcam] Camera failed:', err);
        setError('Camera access denied');
        return;
      }

      // Load COCO-SSD
      try {
        try { await tf.setBackend('webgl'); } catch { await tf.setBackend('cpu'); }
        await tf.ready();
        modelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        console.log('[AI] COCO-SSD lite model ready');
      } catch (e) {
        console.error('[AI] Model load failed:', e);
        // Try fallback to default model
        try {
          modelRef.current = await cocoSsd.load();
          console.log('[AI] COCO-SSD default model ready');
        } catch {
          setError('AI model failed to load');
          return;
        }
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── 2. Detection loop (single setInterval, runs every 2.5s) ──────────────
  useEffect(() => {
    if (!ready) return;

    const intervalId = setInterval(async () => {
      const video = videoRef.current;
      const model = modelRef.current;
      if (!video || !model || video.paused || video.readyState < 2) return;

      let predictions;
      try {
        predictions = await model.detect(video);
      } catch {
        return; // silently skip failed frames
      }

      // Draw bounding boxes on canvas
      drawBoxes(predictions);

      // ── Process detections for proctoring ──
      const elapsed = Date.now() - mountTime.current;
      if (elapsed < GRACE_PERIOD) return;

      let direction = null;

      // 1. ALWAYS check for forbidden objects locally (COCO-SSD is fast)
      const forbiddenObj = predictions.find(p => RESTRICTED.includes(p.class) && p.score > 0.45);
      if (forbiddenObj) {
        direction = `object-${forbiddenObj.class.replace(' ', '-')}`;
      } else {
        // 2. If no objects, check face/gaze
        try {
          const canvas = canvasRef.current;
          if (canvas) {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
            const formData = new FormData();
            formData.append('file', blob);
            
            const pyRes = await fetch('http://localhost:8000/process', { 
              method: 'POST', 
              body: formData,
              signal: AbortController.timeout(1000).signal // Don't hang if server down
            });
            
            if (pyRes.ok) {
              const data = await pyRes.json();
              if (data.direction !== 'center') direction = data.direction;
            } else {
              throw new Error('Python API down');
            }
          }
        } catch (err) {
          // Fallback to internal COCO-SSD logic if Python API is unavailable
          const persons = predictions.filter(p => p.class === 'person' && p.score > 0.4);

          if (persons.length > 1) {
            direction = 'multiple-faces';
          } else if (persons.length === 0) {
            direction = 'away';
          } else if (persons.length === 1) {
            const [bx, by, bw, bh] = persons[0].bbox;
            const frameW = video.videoWidth || 320;
            const frameH = video.videoHeight || 240;
            const ratioX = (bx + bw / 2) / frameW;
            const ratioY = (by + bh / 2) / frameH;
            
            if (ratioX < 0.2) direction = 'right';
            else if (ratioX > 0.8) direction = 'left';
            else if (ratioY < 0.2) direction = 'up';
          }
        }
      }

      // ── Sustained distraction logic ──
      const now = Date.now();

      if (direction === null) {
        // Looking at screen, reset
        distractionStart.current = null;
        currentDir.current = null;
        return;
      }

      // New distraction or direction changed
      if (distractionStart.current === null || direction !== currentDir.current) {
        distractionStart.current = now;
        currentDir.current = direction;
        return;
      }

      // Check if sustained long enough
      if (now - distractionStart.current >= SUSTAINED_MS) {
        distractionStart.current = now; // Reset so it doesn't fire every interval

        // Log to backend
        const startTime = new Date(now - SUSTAINED_MS).toISOString();
        const endTime = new Date(now).toISOString();
        const snapshot = getCode ? getCode() : '';

        if (problemId) {
          api.post('/logs', { problemId, direction, startTime, endTime, codeSnapshot: snapshot }).catch(() => {});
        }

        // Save to IndexedDB backup
        saveToIndexedDB({ direction, startTime, endTime, codeSnapshot: snapshot, problemId });

        // Trigger UI callback
        if (onDistraction) onDistraction(direction);
      }
    }, DETECTION_INTERVAL);

    return () => clearInterval(intervalId);
  }, [ready, getCode, onDistraction, problemId]);

  // ── 3. Draw object boxes on canvas ────────────────────────────────────────
  const drawBoxes = useCallback((preds) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    preds.forEach(pred => {
      if (pred.score < 0.4 || pred.class === 'person') return;

      const [x, y, w, h] = pred.bbox;
      const restricted = RESTRICTED.includes(pred.class);
      const color = restricted ? '#ef4743' : '#ffa116';

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Label
      const label = `${pred.class} ${Math.round(pred.score * 100)}%`;
      ctx.font = 'bold 10px Arial';
      const tw = ctx.measureText(label).width + 6;
      const ly = y > 16 ? y - 14 : y + h + 2;
      ctx.fillStyle = color;
      ctx.fillRect(x, ly, tw, 14);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 3, ly + 10);
    });
  }, []);

  // ── 4. Draggable ──────────────────────────────────────────────────────────
  const handleMouseDown = e => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const move = e => isDragging && setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
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
            <div className={`w-2 h-2 rounded-full ${ready ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span>AI Proctoring</span>
          </div>
          <span className="opacity-50 text-[9px]">{ready ? 'LIVE' : 'Loading...'}</span>
        </div>

        <div className="relative aspect-video bg-black overflow-hidden rounded-b">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 p-2 text-center bg-black/90 z-20">
              ⚠️ {error}
            </div>
          )}

          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full scale-x-[-1] z-10 pointer-events-none"
            style={{ objectFit: 'cover' }}
          />

          {!ready && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 z-20">
              <div className="w-5 h-5 border-2 border-[#ffa116] border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] text-gray-400">Loading AI...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── IndexedDB backup ────────────────────────────────────────────────────────
function saveToIndexedDB(logEntry) {
  try {
    const request = indexedDB.open('CodeHuntLogs', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('distractions')) {
        db.createObjectStore('distractions', { autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction('distractions', 'readwrite');
      tx.objectStore('distractions').add({ ...logEntry, savedAt: new Date().toISOString() });
    };
  } catch { /* IndexedDB not available */ }
}
