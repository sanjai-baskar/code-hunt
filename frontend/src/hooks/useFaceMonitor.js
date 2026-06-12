import { useRef, useCallback } from 'react';
import api from '../api/client';

export function useFaceMonitor({ onDistraction, getCode, problemId }) {
  const distractionStart = useRef(null);
  const currentDir = useRef(null);
  const timerActive = useRef(false);
  const startTimeRef = useRef(Date.now());
  const GRACE_PERIOD_MS = 10000;
  
  // NEW: Sensitivity settings to reduce false positives
  const SENSITIVITY = {
    // Yaw thresholds (head left/right turns) - increased from ±0.22 to ±0.30 to allow reading
    YAW_LEFT: 0.30,
    YAW_RIGHT: -0.30,
    // Pitch threshold (head up/down tilt) - increased from -0.08 to -0.12
    PITCH_UP: -0.12,
    // Duration before flagging sustained deviation (increased from 2500ms to 3500ms)
    // This allows brief glances at questions without penalty
    SUSTAINED_DURATION_MS: 3500,
    // Quick return to center resets the timer (allows natural movement)
    QUICK_RESET_WINDOW_MS: 800,
  };

  const processDetection = useCallback(
    (results, objects = []) => {
      if (Date.now() - startTimeRef.current < GRACE_PERIOD_MS) return;

      let direction = null;

      // 1. Objects
      const forbidden = ["cell phone", "laptop", "tablet", "book", "remote"];
      const foundForbidden = objects.find(
        obj => forbidden.includes(obj.class) && obj.score > 0.5
      );
      if (foundForbidden) {
        direction = `object-${foundForbidden.class.replace(' ', '-')}`;
      }
      // 2. Multiple Faces
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1) {
        direction = 'multiple-faces';
      } 
      // 3. Robust Face Orientation with improved thresholds
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length === 1) {
        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1];
        const leftEye = landmarks[133];
        const rightEye = landmarks[362];
        const topHead = landmarks[10];
        const chin = landmarks[152];

        const faceWidth = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
        const faceHeight = Math.sqrt(Math.pow(chin.x - topHead.x, 2) + Math.pow(chin.y - topHead.y, 2));
        const eyesMidX = (leftEye.x + rightEye.x) / 2;
        const eyesMidY = (leftEye.y + rightEye.y) / 2;

        const yaw = (nose.x - eyesMidX) / faceWidth;
        const pitch = (nose.y - eyesMidY) / faceHeight;

        // Use new, less sensitive thresholds
        if (yaw < SENSITIVITY.YAW_RIGHT) direction = 'right';
        else if (yaw > SENSITIVITY.YAW_LEFT) direction = 'left';
        else if (pitch < SENSITIVITY.PITCH_UP) direction = 'up';
      } else {
        direction = 'away';
      }

      const now = Date.now();
      if (direction === null) {
        // Head returned to neutral position
        if (timerActive.current && distractionStart.current) {
          const timeSinceDeviation = now - distractionStart.current;
          // If deviation lasted less than quick reset window, don't count it
          // This allows students to briefly glance at questions
          if (timeSinceDeviation < SENSITIVITY.QUICK_RESET_WINDOW_MS) {
            // Quick glance - don't flag
            distractionStart.current = null;
            currentDir.current = null;
            timerActive.current = false;
            return;
          }
        }
        distractionStart.current = null;
        currentDir.current = null;
        timerActive.current = false;
        return;
      }

      if (!timerActive.current || direction !== currentDir.current) {
        distractionStart.current = now;
        currentDir.current = direction;
        timerActive.current = true;
        return;
      }

      const elapsed = now - distractionStart.current;
      // Only flag after sustained duration (3500ms instead of 2500ms)
      if (elapsed >= SENSITIVITY.SUSTAINED_DURATION_MS) {
        const startTime = new Date(distractionStart.current).toISOString();
        const endTime = new Date(now).toISOString();
        const snapshot = getCode ? getCode() : '';
        distractionStart.current = now;

        if (problemId) {
          api.post('/logs', { problemId, direction, startTime, endTime, codeSnapshot: snapshot }).catch(() => {});
        }
        saveToIndexedDB({ direction, startTime, endTime, codeSnapshot: snapshot, problemId });
        if (onDistraction) onDistraction(direction);
      }
    },
    [getCode, onDistraction, problemId]
  );

  return { processDetection };
}

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
  } catch {}
}