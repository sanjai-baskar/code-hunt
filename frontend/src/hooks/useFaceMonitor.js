import { useRef, useCallback } from 'react';
import api from '../api/client';

/**
 * useFaceMonitor – Core face-monitoring hook for MediaPipe
 * 
 * Implements the sustained distraction rule (3 seconds of distraction triggers event).
 */
export function useFaceMonitor({ onDistraction, getCode, problemId }) {
  const distractionStart = useRef(null);
  const currentDir = useRef(null);
  const timerActive = useRef(false);
  // Grace period: ignore distractions for 10s while MediaPipe initializes
  const startTimeRef = useRef(Date.now());
  const GRACE_PERIOD_MS = 10000;

  /**
   * processDetection – called from the MediaPipe faceMesh.onResults loop.
   * 
   * @param {Object} results - MediaPipe FaceMesh results
   */
  const processDetection = useCallback(
    (results, objects = []) => {
      // Skip all monitoring during grace period (MediaPipe loading)
      if (Date.now() - startTimeRef.current < GRACE_PERIOD_MS) return;

      let direction = null;

      // 1. Check for forbidden objects (cell phone, laptop, etc.)
      const forbidden = ["cell phone", "laptop", "tablet", "book", "remote"];
      const foundForbidden = objects.find(
        obj => forbidden.includes(obj.class) && obj.score > 0.5
      );
      if (foundForbidden) {
        direction = `object-${foundForbidden.class.replace(' ', '-')}`;
      }

      // 2. Check for Multiple Faces
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1) {
        direction = 'multiple-faces';
      } 
      // 3. Check for Gaze/Face Orientation (using normalized offsets)
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length === 1) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Key landmarks:
        // nose = 1, leftEye = 133, rightEye = 362, topHead = 10, chin = 152
        const nose = landmarks[1];
        const leftEye = landmarks[133];
        const rightEye = landmarks[362];
        const topHead = landmarks[10];
        const chin = landmarks[152];

        // Calculate face dimensions for normalization
        const faceWidth = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
        const faceHeight = Math.sqrt(Math.pow(chin.x - topHead.x, 2) + Math.pow(chin.y - topHead.y, 2));
        
        // Midpoints
        const eyesMidX = (leftEye.x + rightEye.x) / 2;
        const eyesMidY = (leftEye.y + rightEye.y) / 2;

        // 3a. Yaw (Left/Right)
        // In unmirrored image, rightEye is on the left (smaller X).
        // If I turn MY RIGHT, nose moves towards rightEye (smaller X).
        const yaw = (nose.x - eyesMidX) / faceWidth;

        // 3b. Pitch (Up/Down)
        // If I look UP, nose moves UP (smaller Y).
        const pitch = (nose.y - eyesMidY) / faceHeight;

        // Thresholds (Sensitive and Robust)
        // Yaw: Left is positive (> 0.2), Right is negative (< -0.2)
        if (yaw < -0.22) direction = 'right';
        else if (yaw > 0.22) direction = 'left';
        // Pitch: Up is negative (< -0.05), Down is positive (> 0.35)
        else if (pitch < -0.08) direction = 'up';
      } else {
        // No face visible
        direction = 'away';
      }

      const now = Date.now();

      // If looking at screen (no distraction), reset everything
      if (direction === null) {
        distractionStart.current = null;
        currentDir.current = null;
        timerActive.current = false;
        return;
      }

      // If a NEW distraction starts or direction changes
      if (!timerActive.current || direction !== currentDir.current) {
        distractionStart.current = now;
        currentDir.current = direction;
        timerActive.current = true;
        return;
      }

      // Sustained distraction rule: 2.5 seconds of sustained distraction triggers an event
      const elapsed = now - distractionStart.current;
      if (elapsed >= 2500) {
        const startTime = new Date(distractionStart.current).toISOString();
        const endTime   = new Date(now).toISOString();
        const snapshot  = getCode ? getCode() : '';

        // Reset the start time so it doesn't fire every frame while sustained
        distractionStart.current = now;

        // Log to backend
        if (problemId) {
          api.post('/logs', { problemId, direction, startTime, endTime, codeSnapshot: snapshot }).catch(() => {});
        }
        
        // Backup to IndexedDB
        saveToIndexedDB({ direction, startTime, endTime, codeSnapshot: snapshot, problemId });
        
        // Trigger UI callback
        if (onDistraction) onDistraction(direction);
      }
    },
    [getCode, onDistraction, problemId]
  );

  const resetTimer = useCallback(() => {
    distractionStart.current = null;
    currentDir.current = null;
    timerActive.current = false;
  }, []);

  return { processDetection, resetTimer };
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
  } catch {
    // IndexedDB not available
  }
}
