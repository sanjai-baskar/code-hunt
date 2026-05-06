import { useRef, useCallback } from 'react';
import api from '../api/client';

export function useFaceMonitor({ onDistraction, getCode, problemId }) {
  const distractionStart = useRef(null);
  const currentDir = useRef(null);
  const timerActive = useRef(false);
  const startTimeRef = useRef(Date.now());
  const GRACE_PERIOD_MS = 10000;

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
      // 3. Robust Face Orientation
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

        if (yaw < -0.22) direction = 'right';
        else if (yaw > 0.22) direction = 'left';
        else if (pitch < -0.08) direction = 'up';
      } else {
        direction = 'away';
      }

      const now = Date.now();
      if (direction === null) {
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
      if (elapsed >= 2500) {
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