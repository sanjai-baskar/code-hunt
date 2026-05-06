import { useEffect, useRef, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';

const RESTRICTED = ['cell phone', 'laptop', 'tablet', 'book', 'remote'];

export function useObjectDetection(videoRef, canvasRef, enabled) {
  const modelRef = useRef(null);
  const lastObjects = useRef([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!enabled) return;
      try {
        await tf.ready();
        modelRef.current = await cocoSsd.load();
        if (!cancelled) console.log('COCO-SSD loaded');
      } catch (err) {
        console.error('COCO-SSD load error', err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [enabled]);

  const drawBoxes = useCallback((predictions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    predictions.forEach(p => {
      if (p.score < 0.4 || p.class === 'person') return;
      const [x, y, w, h] = p.bbox;
      ctx.strokeStyle = RESTRICTED.includes(p.class) ? '#ef4743' : '#ffa116';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    });
  }, [canvasRef]);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    let intervalId;
    const detect = async () => {
      if (!modelRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const predictions = await modelRef.current.detect(videoRef.current);
        lastObjects.current = predictions;
        drawBoxes(predictions);
      } catch (err) {
        console.error('Detection error', err);
      }
    };
    intervalId = setInterval(detect, 1000);
    return () => clearInterval(intervalId);
  }, [enabled, videoRef, drawBoxes]);

  return lastObjects;
}
