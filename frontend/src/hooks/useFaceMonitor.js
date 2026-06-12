import { useRef, useCallback } from 'react';
import api from '../api/client';

export function useFaceMonitor({ onDistraction, getCode, problemId }) {
  const distractionStart = useRef(null);
  const currentDir = useRef(null);
  const timerActive = useRef(false);
  const startTimeRef = useRef(Date.now());
  const GRACE_PERIOD_MS = 10000;
  
  // STRENGTHENED STRATEGY: Aggressive malpractice detection + allows legitimate reading
  const MONITORING_STRATEGY = {
    // ===== PRIMARY THREAT: Forbidden Objects (AGGRESSIVE) =====
    FORBIDDEN_OBJECTS: ["cell phone", "laptop", "tablet", "book", "remote"],
    OBJECT_CONFIDENCE_THRESHOLD: 0.35,  // LOWERED from 0.5 for more aggressive detection
    
    // ===== SECONDARY THREAT: Multiple people (collaboration) =====
    ALLOW_MULTIPLE_FACES: false,
    
    // ===== HEAD POSITION DETECTION (STRONGER) =====
    EXTREME_YAW_LEFT: 0.45,    // TIGHTENED from 0.50 (45° instead of 50°)
    EXTREME_YAW_RIGHT: -0.45,  // TIGHTENED from -0.50
    EXTREME_PITCH_UP: -0.20,   // TIGHTENED from -0.25 (looking up at wall)
    EXTREME_PITCH_DOWN: 0.30,  // NEW: Looking down at desk/external device
    
    // ===== READING ZONE (STRICT) =====
    READING_ZONE_YAW: 0.35,    // TIGHTENED from 0.40 (tighter left turn tolerance)
    READING_ZONE_PITCH: -0.15, // TIGHTENED from -0.18 (tighter upward tolerance)
    
    // ===== TIMING STRATEGY (AGGRESSIVE) =====
    WARM_UP_PERIOD_MS: 10000,     // SHORTENED from 15s (shorter warm-up)
    SUSTAINED_EXTREME_MS: 3000,   // TIGHTENED from 5s (flag sooner)
    SUSTAINED_READING_MS: 10000,  // TIGHTENED from 15s (flag sooner)
    SUSTAINED_DOWN_MS: 2000,      // NEW: Flag looking down after only 2 seconds
  };

  const processDetection = useCallback(
    (results, objects = []) => {
      const now = Date.now();
      const timeSinceStart = now - startTimeRef.current;
      
      let direction = null;

      // ===== PRIMARY CHECK: Forbidden Objects =====
      const foundForbidden = objects.find(
        obj => MONITORING_STRATEGY.FORBIDDEN_OBJECTS.includes(obj.class) && 
               obj.score > MONITORING_STRATEGY.OBJECT_CONFIDENCE_THRESHOLD
      );
      if (foundForbidden) {
        direction = `object-${foundForbidden.class.replace(' ', '-')}`;
      }
      
      // ===== SECONDARY CHECK: Multiple Faces =====
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1) {
        direction = 'multiple-faces';
      } 
      
      // ===== TERTIARY CHECK: Only track HEAD position (not eye gaze) =====
      // Strategy: Ignore eye movements. Only track if ENTIRE face/head is away from screen
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length === 1) {
        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1];
        const leftEye = landmarks[133];
        const rightEye = landmarks[362];
        const topHead = landmarks[10];
        const chin = landmarks[152];

        // Calculate head orientation (not eye gaze)
        const faceWidth = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
        const faceHeight = Math.sqrt(Math.pow(chin.x - topHead.x, 2) + Math.pow(chin.y - topHead.y, 2));
        const eyesMidX = (leftEye.x + rightEye.x) / 2;
        const eyesMidY = (leftEye.y + rightEye.y) / 2;

        const yaw = (nose.x - eyesMidX) / faceWidth;   // Head turn left/right
        const pitch = (nose.y - eyesMidY) / faceHeight; // Head tilt up/down

        // DURING WARM-UP: Allow all natural movements except obvious cheating
        if (timeSinceStart < MONITORING_STRATEGY.WARM_UP_PERIOD_MS) {
          // Flag only the most obvious cheating attempts during warm-up
          if (yaw < MONITORING_STRATEGY.EXTREME_YAW_RIGHT) direction = 'right-extreme';
          else if (yaw > MONITORING_STRATEGY.EXTREME_YAW_LEFT) direction = 'left-extreme';
          else if (pitch < MONITORING_STRATEGY.EXTREME_PITCH_UP) direction = 'up-extreme';
          else if (pitch > MONITORING_STRATEGY.EXTREME_PITCH_DOWN) direction = 'down-extreme';
        }
        // AFTER WARM-UP: Strict monitoring
        else {
          // Check for looking DOWN (laptop/phone on desk) - aggressive detection
          if (pitch > MONITORING_STRATEGY.EXTREME_PITCH_DOWN) {
            direction = 'down-extreme';  // Looking at something on the desk
          }
          // Reading zone allowed (left side, up) - common for reading problems
          else if (yaw >= 0 && yaw <= MONITORING_STRATEGY.READING_ZONE_YAW &&
                   pitch >= MONITORING_STRATEGY.READING_ZONE_PITCH && pitch <= 0) {
            direction = 'reading-zone';
          }
          // Extreme positions flagged
          else if (yaw < MONITORING_STRATEGY.EXTREME_YAW_RIGHT) {
            direction = 'right-extreme';
          }
          else if (yaw > MONITORING_STRATEGY.EXTREME_YAW_LEFT) {
            direction = 'left-extreme';
          }
          else if (pitch < MONITORING_STRATEGY.EXTREME_PITCH_UP) {
            direction = 'up-extreme';
          }
        }
      } 
      // Face completely hidden
      else {
        direction = 'away';
      }

      // ===== DECISION LOGIC =====
      if (direction === null) {
        // Back to normal position
        distractionStart.current = null;
        currentDir.current = null;
        timerActive.current = false;
        return;
      }

      // NEW direction or continuing same direction
      if (!timerActive.current || direction !== currentDir.current) {
        distractionStart.current = now;
        currentDir.current = direction;
        timerActive.current = true;
        return;
      }

      const elapsed = now - distractionStart.current;
      
      // ===== FLAGGING DECISIONS =====
      let shouldFlag = false;
      let flagDuration = 0;
      
      if (direction === 'reading-zone') {
        // Reading zone allowed only briefly - if student reads for 10+ seconds continuously, probably cheating
        flagDuration = MONITORING_STRATEGY.SUSTAINED_READING_MS;
        shouldFlag = elapsed >= flagDuration;
      }
      else if (direction === 'down-extreme') {
        // AGGRESSIVE: Looking down at desk/external device - flag quickly (2 seconds)
        flagDuration = MONITORING_STRATEGY.SUSTAINED_DOWN_MS;
        shouldFlag = elapsed >= flagDuration;
      }
      else if (direction === 'away') {
        // Face hidden = immediate flag
        shouldFlag = elapsed >= 1000;
      }
      else if (direction === 'multiple-faces') {
        // Multiple faces = immediate flag
        shouldFlag = elapsed >= 1000;
      }
      else if (direction.includes('object-')) {
        // Forbidden object = AGGRESSIVE immediate flag (300ms)
        shouldFlag = elapsed >= 300;
      }
      else if (direction.includes('extreme')) {
        // Extreme head turn = flag after 3 seconds (TIGHTENED from 5)
        flagDuration = MONITORING_STRATEGY.SUSTAINED_EXTREME_MS;
        shouldFlag = elapsed >= flagDuration;
      }

      if (shouldFlag) {
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