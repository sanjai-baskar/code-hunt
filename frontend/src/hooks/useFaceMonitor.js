import { useRef, useCallback } from 'react';
import api from '../api/client';

export function useFaceMonitor({ onDistraction, getCode, problemId }) {
  const distractionStart = useRef(null);
  const currentDir = useRef(null);
  const timerActive = useRef(false);
  const startTimeRef = useRef(Date.now());
  
  // FAIR STRATEGY: Allow students to use their own notes
  // Focus on REAL cheating: external devices, collaboration, face hidden
  const MONITORING_STRATEGY = {
    // ===== CRITICAL: Forbidden External Materials =====
    // Phone screens, tablet screens, external papers being read
    FORBIDDEN_OBJECTS: ["cell phone", "laptop", "tablet", "book", "remote"],
    OBJECT_CONFIDENCE_THRESHOLD: 0.40,
    
    // ===== CRITICAL: Collaboration =====
    ALLOW_MULTIPLE_FACES: false,
    
    // ===== HEAD POSITION: Very Lenient =====
    // Allow students to look left, right, down to check their own notes
    // Only flag if EXTREMELY turned or NEVER looks back at screen
    EXTREME_YAW_LEFT: 0.75,        // ~75 degrees (almost looking behind)
    EXTREME_YAW_RIGHT: -0.75,      // ~75 degrees (almost looking behind)
    EXTREME_PITCH_DOWN: 0.55,      // ~55 degrees (looking straight down at legs)
    EXTREME_PITCH_UP: -0.45,       // ~45 degrees (looking at ceiling)
    
    // ===== TIMING: Only flag sustained unnatural behavior =====
    WARM_UP_PERIOD_MS: 20000,          // First 20s: VERY lenient (student settling)
    BRIEF_GLANCE_OK_MS: 3000,          // Glances < 3s are fine (checking notes)
    SUSTAINED_ANOMALY_MS: 10000,       // Sustained extreme > 10s = suspicious
    CONTINUOUS_DEVIATION_MS: 30000,    // Never looks at screen > 30s = suspicious
  };

  const processDetection = useCallback(
    (results, objects = []) => {
      const now = Date.now();
      const timeSinceStart = now - startTimeRef.current;
      
      let direction = null;

      // ===== PRIORITY 1: External Cheating Devices =====
      // Phone, tablet, laptop screens being read
      const foundForbidden = objects.find(
        obj => MONITORING_STRATEGY.FORBIDDEN_OBJECTS.includes(obj.class) && 
               obj.score > MONITORING_STRATEGY.OBJECT_CONFIDENCE_THRESHOLD
      );
      if (foundForbidden) {
        direction = `object-${foundForbidden.class.replace(' ', '-')}`;
      }
      
      // ===== PRIORITY 2: Collaboration =====
      else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1) {
        direction = 'multiple-faces';
      }
      
      // ===== PRIORITY 3: Face Position =====
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

        // ===== DURING WARM-UP: Almost no head position flags =====
        if (timeSinceStart < MONITORING_STRATEGY.WARM_UP_PERIOD_MS) {
          // Only flag if EXTREMELY turned away (almost impossible to do by accident)
          if (Math.abs(yaw) >= MONITORING_STRATEGY.EXTREME_YAW_LEFT ||
              pitch >= MONITORING_STRATEGY.EXTREME_PITCH_DOWN ||
              pitch <= MONITORING_STRATEGY.EXTREME_PITCH_UP) {
            direction = 'extreme-position-warmup';
          }
        }
        // ===== AFTER WARM-UP: Allow normal note-checking =====
        else {
          // Check if extremely turned (not normal note-checking)
          if (yaw >= MONITORING_STRATEGY.EXTREME_YAW_LEFT) {
            direction = 'extreme-left';  // Looking almost behind you
          }
          else if (yaw <= MONITORING_STRATEGY.EXTREME_YAW_RIGHT) {
            direction = 'extreme-right';  // Looking almost behind you
          }
          else if (pitch >= MONITORING_STRATEGY.EXTREME_PITCH_DOWN) {
            direction = 'extreme-down';  // Looking at legs/floor
          }
          else if (pitch <= MONITORING_STRATEGY.EXTREME_PITCH_UP) {
            direction = 'extreme-up';  // Looking at ceiling
          }
          // Normal range - student might be checking notes (allowed)
          else {
            direction = 'normal-range';  // Looking at screen or notes (both OK)
          }
        }
      } 
      // ===== Face completely hidden =====
      else {
        direction = 'away';
      }

      // ===== DECISION LOGIC =====
      if (direction === null || direction === 'normal-range') {
        // Back to normal or always in normal range - reset
        distractionStart.current = null;
        currentDir.current = null;
        timerActive.current = false;
        return;
      }

      // New direction detected or continuing same suspicious direction
      if (!timerActive.current || direction !== currentDir.current) {
        distractionStart.current = now;
        currentDir.current = direction;
        timerActive.current = true;
        return;
      }

      const elapsed = now - distractionStart.current;

      // ===== FLAGGING RULES (Only flag REAL malpractice) =====
      let shouldFlag = false;

      // RULE 1: External devices (phone, tablet) = IMMEDIATE FLAG
      if (direction.startsWith('object-')) {
        shouldFlag = elapsed >= 300;
      }
      // RULE 2: Multiple faces = IMMEDIATE FLAG
      else if (direction === 'multiple-faces') {
        shouldFlag = elapsed >= 300;
      }
      // RULE 3: Face completely hidden = IMMEDIATE FLAG
      else if (direction === 'away') {
        shouldFlag = elapsed >= 2000;
      }
      // RULE 4: Extremely turned away = Flag if sustained
      else if (direction.startsWith('extreme')) {
        // Only flag if sustained for way too long
        shouldFlag = elapsed >= MONITORING_STRATEGY.SUSTAINED_ANOMALY_MS;  // 10 seconds
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
