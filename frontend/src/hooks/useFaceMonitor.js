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
      // 3. Check for Gaze/Face Orientation (using distance ratios)
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length === 1) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Key landmarks:
        // nose = 1, leftEye = 133, rightEye = 362, topHead = 10, chin = 152
        const nose = landmarks[1];
        const leftEye = landmarks[133];
        const rightEye = landmarks[362];
        const topHead = landmarks[10];
        const chin = landmarks[152];

        // 3a. Yaw (Left/Right)
        // Distance from nose to eyes
        const distL = Math.sqrt(Math.pow(nose.x - leftEye.x, 2) + Math.pow(nose.y - leftEye.y, 2));
        const distR = Math.sqrt(Math.pow(nose.x - rightEye.x, 2) + Math.pow(nose.y - rightEye.y, 2));
        
        // In MediaPipe, leftEye(133) is the person's left.
        // Turning RIGHT (towards person's right eye) -> nose moves closer to right eye, away from left eye.
        // distL increases, distR decreases -> ratio distL/distR increases.
        const yawRatio = distL / distR;

        // 3b. Pitch (Up/Down)
        const distT = Math.abs(nose.y - topHead.y);
        const distB = Math.abs(nose.y - chin.y);
        const pitchRatio = distT / distB;

        // Thresholds (Tweakable)
        if (yawRatio > 2.2) direction = 'right';
        else if (yawRatio < 0.45) direction = 'left';
        else if (pitchRatio < 0.5) direction = 'up';
        // else if (pitchRatio > 1.8) direction = 'down'; // Optional: monitor looking down
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

      // Sustained distraction rule: 3 seconds of sustained distraction triggers an event
      const elapsed = now - distractionStart.current;
      if (elapsed >= 3000) {
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
