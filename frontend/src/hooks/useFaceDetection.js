import { useEffect, useRef } from 'react';

export function useFaceDetection(videoRef, enabled, onResults) {
  const faceMeshRef = useRef(null);
  // Keep a stable ref to the latest onResults callback so the FaceMesh
  // instance always calls the most-current handler without needing to be
  // re-created every time the callback reference changes.
  const onResultsRef = useRef(onResults);
  useEffect(() => { onResultsRef.current = onResults; }, [onResults]);

  // ── Init FaceMesh once (or when enabled/videoRef changes) ──────────────
  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    let fm;
    try {
      // @ts-ignore - FaceMesh loaded globally from CDN in index.html
      fm = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      fm.setOptions({
        maxNumFaces: 10,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      // Delegate to the ref so we never need to rebuild FaceMesh when the
      // parent's callback identity changes.
      fm.onResults((results) => onResultsRef.current(results));
      faceMeshRef.current = fm;
    } catch (err) {
      console.error('FaceMesh init error', err);
    }

    return () => {
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, [enabled, videoRef]); // intentionally omit onResults — using ref instead

  // ── Animation loop: send frames to FaceMesh ────────────────────────────
  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    let animId;
    let frameCount = 0;

    const send = async () => {
      if (
        faceMeshRef.current &&
        videoRef.current &&
        videoRef.current.readyState >= 2
      ) {
        frameCount++;
        if (frameCount % 2 === 0) { // Process every 2nd frame
          try {
            await faceMeshRef.current.send({ image: videoRef.current });
          } catch (err) {
            console.error('FaceMesh send error', err);
          }
        }
      }
      animId = requestAnimationFrame(send);
    };
    send();
    return () => cancelAnimationFrame(animId);
  }, [enabled, videoRef]);
}
