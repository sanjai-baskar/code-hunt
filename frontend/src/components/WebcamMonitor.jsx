import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { useFaceMonitor } from '../hooks/useFaceMonitor';

const RESTRICTED = ["cell phone", "laptop", "tablet", "book", "remote"];

export default function WebcamMonitor({ onDistraction, getCode, problemId }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const modelRef   = useRef(null);
  const faceRef    = useRef(null);
  const predsRef   = useRef([]);
  const streamRef  = useRef(null);

  const [ready, setReady]       = useState(false);
  const [error, setError]       = useState('');
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 240 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { processDetection } = useFaceMonitor({ onDistraction, getCode, problemId });

  // ── 1. Start webcam with plain getUserMedia (smooth, no wrapper) ────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();

          // Set canvas size once
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width  = video.videoWidth  || 640;
            canvas.height = video.videoHeight || 480;
          }
        }
      } catch (err) {
        console.error('[Webcam] getUserMedia failed:', err);
        setError('Camera access denied');
        if (onDistraction) onDistraction('camera-off');
        return;
      }

      // Load COCO-SSD
      try {
        try { await tf.setBackend('webgl'); } catch { await tf.setBackend('cpu'); }
        await tf.ready();
        modelRef.current = await cocoSsd.load();
        console.log('[AI] COCO-SSD ready');
      } catch (e) {
        console.error('[AI] COCO-SSD failed:', e);
      }

      // Load FaceMesh
      try {
        // @ts-ignore
        const fm = new window.FaceMesh({
          locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
        });
        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        fm.onResults(results => {
          processDetection(results, predsRef.current);
        });
        faceRef.current = fm;
        console.log('[AI] FaceMesh ready');
      } catch (e) {
        console.error('[AI] FaceMesh failed:', e);
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (faceRef.current) {
        try { faceRef.current.close(); } catch {}
      }
    };
  }, [onDistraction, processDetection]);

  // ── 2. Throttled FaceMesh loop (every 600ms — NOT every frame) ──────────
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(async () => {
      const video = videoRef.current;
      const fm    = faceRef.current;
      if (!video || !fm || video.paused || video.readyState < 2) return;
      try {
        await fm.send({ image: video });
      } catch { /* ignore transient errors */ }
    }, 600);

    return () => clearInterval(id);
  }, [ready]);

  // ── 3. COCO-SSD object detection loop (every 3s) ───────────────────────
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !modelRef.current || video.paused || video.readyState < 2) return;
      try {
        const preds = await modelRef.current.detect(video);
        predsRef.current = preds;

        // Draw bounding boxes
        drawBoxes(preds);

        const found = preds.filter(p => p.score > 0.4 && p.class !== 'person');
        if (found.length) {
          console.log('[COCO-SSD]', found.map(p => `${p.class} ${Math.round(p.score*100)}%`).join(' | '));
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => clearInterval(id);
  }, [ready]);

  // ── 4. Draw object boxes only (no face mesh drawing = no flicker) ───────
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

      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.strokeRect(x, y, w, h);

      const label = `${pred.class} ${Math.round(pred.score * 100)}%`;
      ctx.font = 'bold 11px Arial';
      const tw = ctx.measureText(label).width + 8;
      const ly = y > 20 ? y - 16 : y + h + 2;
      ctx.fillStyle = color;
      ctx.fillRect(x, ly, tw, 16);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 4, ly + 12);
    });
  }, []);

  // ── 5. Draggable ──────────────────────────────────────────────────────────
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
            <div className={`w-2 h-2 rounded-full ${ready ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span>AI Proctoring</span>
          </div>
          <span className="opacity-50 text-[9px]">{ready ? 'LIVE' : '...'}</span>
        </div>

        <div className="relative aspect-video bg-black overflow-hidden rounded-b">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 p-2 text-center bg-black/90 z-20">
              {error}
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
