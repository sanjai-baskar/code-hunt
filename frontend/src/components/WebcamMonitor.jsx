import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useWebcam } from '../hooks/useWebcam';
import { useObjectDetection } from '../hooks/useObjectDetection';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useFaceMonitor } from '../hooks/useFaceMonitor';

export default function WebcamMonitor({ onDistraction, getCode, problemId }) {
  const canvasRef = useRef(null);
  const { videoRef, streamReady, error: camError } = useWebcam();
  const lastObjects = useObjectDetection(videoRef, canvasRef, streamReady);

  const handleDistraction = useCallback((dir) => {
    setLastEvent(dir);
    setTimeout(() => setLastEvent(null), 3000);
    if (onDistraction) onDistraction(dir);
  }, [onDistraction]);

  // Face monitoring logic
  const { processDetection } = useFaceMonitor({
    onDistraction: handleDistraction,
    getCode,
    problemId,
  });

  const [status, setStatus] = useState('Initializing...');
  const [lastEvent, setLastEvent] = useState(null);

  // Face detection results handler
  const handleFaceResults = useCallback((results) => {
    processDetection(results, lastObjects.current);
    if (results.multiFaceLandmarks?.length) {
      setStatus('Monitoring');
    } else {
      setStatus('Face Hidden');
    }
  }, [processDetection, lastObjects]);

  useFaceDetection(videoRef, streamReady, handleFaceResults);


  // Draggable overlay
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 240 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      className="webcam-monitor w-[160px] md:w-[220px]"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="webcam-inner">
        <div className="webcam-header">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${streamReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-medium">
              {lastEvent ? (
                <span className="text-red-500">⚠️ {lastEvent.toUpperCase()}</span>
              ) : (
                <span>AI: {status}</span>
              )}
            </span>
          </div>
        </div>
        <div className="relative aspect-video bg-black/20 overflow-hidden rounded-b">
          {camError && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-500 p-2 text-center bg-background/90 z-20">
              ⚠️ {camError}
            </div>
          )}
          <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
          <canvas ref={canvasRef} width="320" height="240" className="absolute inset-0 w-full h-full scale-x-[-1] z-10 pointer-events-none" />
          {!streamReady && !camError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-20">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}