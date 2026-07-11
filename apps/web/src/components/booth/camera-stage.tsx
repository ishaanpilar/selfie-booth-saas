"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera as CameraIcon } from "lucide-react";
import { CameraController, CameraSourceError, WebcamCameraSource } from "@selfie-booth/core/camera";
import { Button, CountdownOverlay } from "@selfie-booth/ui";
import { useBoothStore, createCapturedPhoto } from "@/lib/booth/booth-store";
import { uploadOriginalPhoto } from "@/lib/booth/booth-api";

export function CameraStage() {
  const { config, selectedTemplate, sessionId, setCapturedPhotos, setPhotoId, setStage, setError } = useBoothStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<CameraController | null>(null);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shotIndex, setShotIndex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const shotCount = Math.max(1, selectedTemplate?.design.slots.length ?? 1);
  const countdownSeconds = config?.booth.settings?.countdownSeconds ?? 3;

  useEffect(() => {
    let cancelled = false;
    const source = new WebcamCameraSource({ kind: "webcam", facingMode: "user" });
    const controller = new CameraController(source);
    controller
      .start()
      .then(() => {
        if (cancelled) return;
        controllerRef.current = controller;
        if (videoRef.current) controller.attachPreview(videoRef.current);
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setCameraError(
          err instanceof CameraSourceError && err.code === "PERMISSION_DENIED"
            ? "Camera access was denied. This kiosk needs camera permission to take photos."
            : "Could not access the camera. Check that it's connected and not in use by another app.",
        );
      });

    return () => {
      cancelled = true;
      controller.stop();
    };
  }, []);

  const captureAll = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller || !sessionId) return;
    setCapturing(true);

    try {
      const frames = await controller.captureBurst({
        count: shotCount,
        intervalMs: 800,
        countdownSeconds,
        onCountdownTick: (remaining, photoIndex) => {
          setShotIndex(photoIndex);
          setCountdown(remaining);
        },
      });
      setCountdown(null);
      controller.stop();

      const photos = frames.map((frame, i) => createCapturedPhoto(i, frame.blob));
      setCapturedPhotos(photos);
      setStage("editing");

      // Upload originals in the background; the editing stage doesn't need
      // to wait on this, but each photo needs a server-side `photoId`
      // before its edited version can be PATCHed later.
      void Promise.all(
        photos.map(async (photo) => {
          try {
            const { photoId } = await uploadOriginalPhoto(sessionId, photo.sequence, photo.originalBlob);
            setPhotoId(photo.sequence, photoId);
          } catch (err) {
            console.error(`Failed to upload photo ${photo.sequence}:`, err);
          }
        }),
      );
    } catch (err) {
      setCapturing(false);
      setCountdown(null);
      setError(err instanceof Error ? err.message : "Capture failed. Please try again.");
    }
  }, [sessionId, shotCount, countdownSeconds, setCapturedPhotos, setStage, setPhotoId, setError]);

  if (cameraError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <CameraIcon className="h-10 w-10 text-slate-400" />
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{cameraError}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6">
      <div className="relative flex-1 overflow-hidden rounded-2xl bg-slate-900">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover [transform:scaleX(-1)]" />
        <CountdownOverlay secondsRemaining={countdown} />
        {shotCount > 1 && (
          <div className="absolute left-4 top-4 flex gap-1.5">
            {Array.from({ length: shotCount }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${i < shotIndex || (i === shotIndex && !capturing) ? "bg-white/40" : i === shotIndex ? "bg-white" : "bg-white/20"}`}
              />
            ))}
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0.4 }}>
        <Button size="lg" className="w-full" onClick={captureAll} disabled={!ready || capturing} loading={capturing}>
          <CameraIcon className="h-4 w-4" />
          {shotCount > 1 ? `Start ${shotCount}-photo strip` : "Capture"}
        </Button>
      </motion.div>
    </div>
  );
}
