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

  /**
   * processDetection – called from the MediaPipe faceMesh.onResults loop.
   * 
   * @param {Object} results - MediaPipe FaceMesh results
   */
  const processDetection = useCallback(
    (results, objects = []) => {
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
      // 2. Check for Gaze/Face Orientation (using the user's technique)
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length === 1) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Key landmarks from snippet:
        // nose = 1, leftEye = 133, rightEye = 362, topHead = 10, chin = 152
        const nose = landmarks[1];
        const leftEye = landmarks[133];
        const rightEye = landmarks[362];
        const topHead = landmarks[10];
        const chin = landmarks[152];

        const eyesMidX = (leftEye.x + rightEye.x) / 2;
        const yaw = (nose.x - eyesMidX) / (rightEye.x - leftEye.x);
        
        const faceHeight = chin.y - topHead.y;
        const noseRelPos = (nose.y - topHead.y) / faceHeight;

        if (yaw < -0.4) direction = "left";
        else if (yaw > 0.4) direction = "right";
        else if (noseRelPos < 0.35) direction = "up";
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

      // Sustained distraction rule: 5 seconds of sustained distraction triggers an event
      const elapsed = now - distractionStart.current;
      if (elapsed >= 5000) {
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
