import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import api from '../api/client';
import { useFaceMonitor } from '../hooks/useFaceMonitor';


const RESTRICTED = ["cell phone", "laptop", "tablet", "book", "remote"];
const GRACE_PERIOD = 5000;    // 5s grace period
const SUSTAINED_MS = 3000;    // 3s sustained distraction to trigger event
const FRAME_SKIP = 3;         // Only process every 3rd frame for performance

export default function WebcamMonitor({ onDistraction, getCode, problemId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const faceMeshRef = useRef(null);
  const streamRef = useRef(null);
  const mountTime = useRef(Date.now());
  
  // Tracking refs
  const distractionStart = useRef(null);
  const currentDir = useRef(null);
  const frameCount = useRef(0);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 240 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState('Initializing...');
  const [lastEvent, setLastEvent] = useState(null);

  const { processDetection } = useFaceMonitor({
    onDistraction: (dir) => {
      if (onDistraction) onDistraction(dir);
      setLastEvent(dir);
      setTimeout(() => setLastEvent(null), 3000);
    },
    getCode,
    problemId
  });



  // ── 1. Unified Initialization ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Start Webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: false
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // 2. Load COCO-SSD
        await tf.ready();
        modelRef.current = await cocoSsd.load();

        // 3. Load MediaPipe FaceMesh (Global window version)
        // @ts-ignore
        const fm = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        fm.onResults((results) => {
          if (!cancelled) {
            processDetection(results, lastObjects.current);
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              setStatus('Monitoring');
            } else {
              setStatus('Face Hidden');
            }
          }
        });

        faceMeshRef.current = fm;


        if (!cancelled) setReady(true);
      } catch (err) {
        console.error('[AI] Init failed:', err);
        setError('Camera or AI failed to start');
      }
    }

    init();
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── 2. Processing Loop ────────────────────────────────────────────────────
  const lastObjects = useRef([]);


  // Bounding Box Drawing & Object Detection
  useEffect(() => {
    if (!ready) return;
    let animId;

    const process = async () => {
      frameCount.current++;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        // 1. Process Face (every 2nd frame)
        if (frameCount.current % 2 === 0 && faceMeshRef.current) {
          await faceMeshRef.current.send({ image: video });
        }

        // 2. Process Objects (every 30th frame ~1s)
        if (frameCount.current % 30 === 0 && modelRef.current) {
          const preds = await modelRef.current.detect(video);
          lastObjects.current = preds;
          drawBoxes(preds);
        }

      }
      animId = requestAnimationFrame(process);
    };

    process();
    return () => cancelAnimationFrame(animId);
  }, [ready, onDistraction]);

  const drawBoxes = (preds) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    preds.forEach(p => {
      if (p.score < 0.4 || p.class === 'person') return;
      const [x, y, w, h] = p.bbox;
      ctx.strokeStyle = RESTRICTED.includes(p.class) ? '#ef4743' : '#ffa116';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    });
  };

  // Draggable logic
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

  return (
    <div className="webcam-monitor w-[160px] md:w-[220px]" style={{ left: position.x, top: position.y }} onMouseDown={handleMouseDown}>
      <div className="webcam-inner">
        <div className="webcam-header flex justify-between px-2 py-1 bg-gray-800 text-white text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${ready ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-medium">
              {lastEvent ? (
                <span className="text-red-400">⚠️ {lastEvent.toUpperCase()}</span>
              ) : (
                <span>AI: {status}</span>
              )}
            </span>
          </div>
        </div>
        <div className="relative aspect-video bg-black overflow-hidden rounded-b">
          {error && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 p-2 text-center bg-black/90 z-20">⚠️ {error}</div>}
          <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
          <canvas ref={canvasRef} width="320" height="240" className="absolute inset-0 w-full h-full scale-x-[-1] z-10 pointer-events-none" />
          {!ready && !error && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
               <div className="w-5 h-5 border-2 border-[#ffa116] border-t-transparent rounded-full animate-spin" />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
