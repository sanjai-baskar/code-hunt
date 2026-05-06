import { useRef, useCallback } from 'react';
import api from '../api/client';

/**
 * useFaceMonitor – Core face-monitoring hook
 *
 * ALGORITHM (10-second sustained rule):
 *  1. Detection loop runs every 200ms via requestAnimationFrame.
 *  2. Head pose is estimated from 68 facial landmarks (nose tip, eye corners, chin).
 *  3. When a distraction direction is first detected, a 10-second countdown begins.
 *  4. If the SAME direction persists for the full 10 seconds → fire onDistraction().
 *  5. If the student looks back (yaw/pitch return to normal) → cancel the countdown.
 *  6. onDistraction() logs to the backend DB and calls the caller's callback.
 *
 * Thresholds:
 *  - Yaw  > 30°  (left or right)
 *  - Pitch > 20° (up)
 *  - Pitch < -20° (down)
 *
 * @param {Object} opts
 * @param {Function} opts.onDistraction  - called with (direction) after 10s
 * @param {Function} opts.getCode        - returns current editor code (for snapshot)
 * @param {string}   opts.problemId
 */
export function useFaceMonitor({ onDistraction, getCode, problemId }) {
  // Ref: tracks the start timestamp of current distraction direction
  const distractionStart = useRef(null);
  // Ref: which direction we're currently tracking
  const currentDir = useRef(null);
  // Ref: set to true while 10s window is active
  const timerActive = useRef(false);

  /**
   * estimateHeadPose – simplified head pose from 68 landmarks.
   * Returns { yaw, pitch } in approximate degrees.
   *
   * Key landmarks used (0-indexed):
   *  - 30 = nose tip
   *  - 8  = chin
   *  - 36 = left eye outer corner
   *  - 45 = right eye outer corner
   *  - 27 = nose bridge top
   */
  const estimateHeadPose = useCallback((landmarks) => {
    const pts = landmarks.positions;

    const noseTip    = pts[30];
    const noseTop    = pts[27];
    const leftEye    = pts[36];
    const rightEye   = pts[45];
    const chin       = pts[8];

    // Face width and height for normalization
    const faceWidth  = Math.abs(rightEye.x - leftEye.x);
    const faceHeight = Math.abs(chin.y - noseTop.y);
    if (faceWidth < 10 || faceHeight < 10) return { yaw: 0, pitch: 0 };

    // Eye midpoint
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeMidY = (leftEye.y + rightEye.y) / 2;

    // Yaw: positive = looking right (from camera POV = face turned left)
    // We invert so positive yaw = face rotated to the right (student's right)
    const yawRaw  = (noseTip.x - eyeMidX) / (faceWidth * 0.5);
    const yaw     = yawRaw * 50; // scale to approximate degrees

    // Pitch: positive = looking up, negative = looking down
    const pitchRaw = (eyeMidY - noseTip.y) / (faceHeight * 0.5);
    const pitch    = pitchRaw * 40; // scale to approximate degrees

    return { yaw, pitch };
  }, []);

  /**
   * classifyDirection – converts yaw/pitch angles to a named direction string.
   * Returns null if within normal range (student looking at screen).
   */
  const classifyDirection = useCallback(({ yaw, pitch }) => {
    if (Math.abs(yaw) > 30) return yaw > 0 ? 'right' : 'left';
    if (pitch > 20)  return 'up';
    return null; // looking at screen – no distraction
  }, []);

  /**
   * processDetection – called from the detection loop for every frame.
   * Implements the 10-second sustained rule.
   *
   * @param {Object|null} detection - face-api detection result, or null if no face
   */
  const processDetection = useCallback(
    (detections, objects = []) => {
      let direction = null;

      // 1. Check for multiple people
      if (detections && detections.length > 1) {
        direction = 'multiple-faces';
      } 
      // 2. Check for prohibited objects (cell phones)
      else if (objects && objects.some(obj => obj.class === 'cell phone' && obj.score > 0.6)) {
        direction = 'mobile-phone';
      }
      // 3. Process normal face distraction logic
      else if (detections && detections.length === 1) {
        const detection = detections[0];
        const { yaw, pitch } = estimateHeadPose(detection.landmarks);
        direction = classifyDirection({ yaw, pitch });
      } else {
        // No face visible
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
      if (elapsed >= 3000) {
        const startTime = new Date(distractionStart.current).toISOString();
        const endTime   = new Date(now).toISOString();
        const snapshot  = getCode ? getCode() : '';

        distractionStart.current = now;

        if (problemId) {
          api.post('/logs', { problemId, direction, startTime, endTime, codeSnapshot: snapshot }).catch(() => {});
        }
        
        saveToIndexedDB({ direction, startTime, endTime, codeSnapshot: snapshot, problemId });
        onDistraction && onDistraction(direction);
      }
    },
    [estimateHeadPose, classifyDirection, getCode, onDistraction, problemId]
  );

  /** resetTimer – call when student submits to clear any pending distraction */
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
    // IndexedDB not available — ignore
  }
}
