'use client';

import { useEffect, useState } from 'react';

export interface PresenceMetrics {
  eyeContactPercent?: number;
  postureScore?: number;
}

type Landmark = { x: number; y: number; visibility?: number };
type LandmarkResult = { faceLandmarks?: Landmark[][]; landmarks?: Landmark[][] };
type VisionTask = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => LandmarkResult;
  close: () => void;
};
type VisionModule = {
  FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
  FaceLandmarker: { createFromOptions: (files: unknown, options: Record<string, unknown>) => Promise<VisionTask> };
  PoseLandmarker: { createFromOptions: (files: unknown, options: Record<string, unknown>) => Promise<VisionTask> };
};

/** Opt-in vision analysis. Video frames stay in-memory in this browser session. */
export function useInterviewPresenceMetrics(video: HTMLVideoElement | null, enabled: boolean) {
  const [metrics, setMetrics] = useState<PresenceMetrics>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !video) return;
    let cancelled = false;
    let raf = 0;
    let faceTask: VisionTask | null = null;
    let poseTask: VisionTask | null = null;
    let frameCount = 0;
    let lookingCount = 0;
    let postureTotal = 0;
    let postureFrames = 0;
    let lastDetectionAt = 0;

    const run = async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision') as unknown as VisionModule;
        const files = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm',
        );
        const [face, pose] = await Promise.all([
          vision.FaceLandmarker.createFromOptions(files, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
          }),
          vision.PoseLandmarker.createFromOptions(files, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          }),
        ]);
        if (cancelled) {
          face.close();
          pose.close();
          return;
        }
        faceTask = face;
        poseTask = pose;

        const sample = (now: number) => {
          if (cancelled) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && now - lastDetectionAt >= 250) {
            lastDetectionAt = now;
            const faceLandmarks = faceTask?.detectForVideo(video, now).faceLandmarks?.[0];
            const poseLandmarks = poseTask?.detectForVideo(video, now).landmarks?.[0];
            if (faceLandmarks?.length) {
              frameCount += 1;
              // A centered, forward-facing face is used as a lightweight eye-contact proxy.
              const nose = faceLandmarks[1];
              const leftEye = faceLandmarks[33];
              const rightEye = faceLandmarks[263];
              if (nose && leftEye && rightEye) {
                const eyeCenter = (leftEye.x + rightEye.x) / 2;
                const eyeWidth = Math.max(0.01, Math.abs(rightEye.x - leftEye.x));
                const centered = Math.abs(nose.x - eyeCenter) / eyeWidth < 0.18;
                const lookingAtCamera = centered && nose.y > Math.min(leftEye.y, rightEye.y) && nose.y < Math.max(leftEye.y, rightEye.y) + 0.45;
                if (lookingAtCamera) lookingCount += 1;
              }
            }
            if (poseLandmarks?.length) {
              const leftShoulder = poseLandmarks[11];
              const rightShoulder = poseLandmarks[12];
              if (leftShoulder && rightShoulder && (leftShoulder.visibility ?? 1) > 0.35 && (rightShoulder.visibility ?? 1) > 0.35) {
                const levelScore = Math.max(0, 100 - Math.abs(leftShoulder.y - rightShoulder.y) * 500);
                const centeredScore = Math.max(0, 100 - Math.abs((leftShoulder.x + rightShoulder.x) / 2 - 0.5) * 100);
                postureTotal += levelScore * 0.65 + centeredScore * 0.35;
                postureFrames += 1;
              }
            }
            if (frameCount > 0 || postureFrames > 0) {
              setMetrics({
                ...(frameCount > 0 ? { eyeContactPercent: Math.round((lookingCount / frameCount) * 100) } : {}),
                ...(postureFrames > 0 ? { postureScore: Math.round(postureTotal / postureFrames) } : {}),
              });
            }
          }
          raf = requestAnimationFrame(sample);
        };
        raf = requestAnimationFrame(sample);
      } catch {
        if (!cancelled) setError('Browser-only vision models could not load. Speech feedback will still be available.');
      }
    };

    setError(null);
    void run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      faceTask?.close();
      poseTask?.close();
    };
  }, [enabled, video]);

  return { metrics, error };
}
