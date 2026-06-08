import { useEffect, useRef } from 'react';

export function useFaceDetection(videoRef, enabled, onResults) {
  const faceMeshRef = useRef(null);

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
      fm.onResults(onResults);
      faceMeshRef.current = fm;
    } catch (err) {
      console.error('FaceMesh init error', err);
    }

    return () => {
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
    };
  }, [enabled, videoRef, onResults]);

  useEffect(() => {
    if (!enabled || !faceMeshRef.current || !videoRef.current) return;
    let animId;
    let frameCount = 0;

    const send = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
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
