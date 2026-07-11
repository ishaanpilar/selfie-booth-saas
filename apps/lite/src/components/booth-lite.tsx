"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Download, Printer, RotateCcw, Images, Image as ImageIcon } from "lucide-react";
import {
  CameraController,
  CameraSourceError,
  WebcamCameraSource,
  buildCssFilter,
  createEmptyEdits,
  FilmStripRenderer,
  PhotoEditor,
  type CameraFrame,
} from "@selfie-booth/core";
import { Button, useToast } from "@selfie-booth/ui";
import { CountdownOverlay } from "./countdown-overlay";
import { FilterStrip } from "./filter-strip";
import { UpsellBanner } from "./upsell-banner";
import { DEFAULT_STRIP_TEMPLATE } from "@/lib/default-template";

type Mode = "single" | "strip3";
type Stage = "start" | "live" | "capturing" | "review";

const photoEditor = new PhotoEditor();
const filmStripRenderer = new FilmStripRenderer();

export function BoothLite() {
  const [stage, setStage] = useState<Stage>("start");
  const [mode, setMode] = useState<Mode>("single");
  const [filterId, setFilterId] = useState("none");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<CameraController | null>(null);
  const resultBlobRef = useRef<Blob | null>(null);
  const { push } = useToast();

  useEffect(() => {
    return () => {
      controllerRef.current?.stop();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const source = new WebcamCameraSource({ kind: "webcam", facingMode: "user" });
      const controller = new CameraController(source);
      await controller.start();
      controllerRef.current = controller;
      if (videoRef.current) controller.attachPreview(videoRef.current);
      setStage("live");
    } catch (err) {
      if (err instanceof CameraSourceError) {
        setError(
          err.code === "PERMISSION_DENIED"
            ? "Camera access was denied. Allow camera permission in your browser and try again."
            : err.message,
        );
      } else {
        setError("Could not access the camera on this device.");
      }
    }
  }, []);

  const capture = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) return;
    setStage("capturing");

    try {
      let frames: CameraFrame[];
      if (mode === "single") {
        const frame = await controller.captureSingle(3, setCountdown);
        frames = [frame];
      } else {
        frames = await controller.captureBurst({
          count: 3,
          intervalMs: 700,
          countdownSeconds: 3,
          onCountdownTick: (remaining) => setCountdown(remaining),
        });
      }
      setCountdown(null);

      const edits = { ...createEmptyEdits(), filterId };
      const baked = await Promise.all(frames.map((frame) => photoEditor.apply(frame.blob, edits)));

      const finalBlob =
        mode === "single" ? baked[0]! : (await filmStripRenderer.render(DEFAULT_STRIP_TEMPLATE, baked, {}, { includeCropMarks: false })).blob;

      controller.stop();
      resultBlobRef.current = finalBlob;
      setResultUrl(URL.createObjectURL(finalBlob));
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while capturing your photo.");
      setStage("live");
    }
  }, [mode, filterId]);

  const retake = useCallback(() => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    resultBlobRef.current = null;
    setStage("start");
    void startCamera();
  }, [resultUrl, startCamera]);

  const download = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `selfie-booth-${Date.now()}.png`;
    a.click();
    push({ tone: "success", title: "Saved", description: "Your photo downloaded to this device." });
  }, [resultUrl, push]);

  const print = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Camera className="h-4.5 w-4.5" />
        </div>
        <h1 className="text-lg font-semibold">Selfie Booth</h1>
      </header>

      {stage === "start" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col justify-center gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">Take a photo, instantly</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No sign-up. Nothing is uploaded — your photo stays on this device until you download or print it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ModeButton icon={ImageIcon} label="Single photo" active={mode === "single"} onClick={() => setMode("single")} />
            <ModeButton icon={Images} label="3-photo strip" active={mode === "strip3"} onClick={() => setMode("strip3")} />
          </div>

          {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button size="lg" onClick={startCamera}>
            <Camera className="h-4 w-4" />
            Open camera
          </Button>

          <UpsellBanner />
        </motion.div>
      )}

      {(stage === "live" || stage === "capturing") && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-900">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover [transform:scaleX(-1)]"
              style={{ filter: buildCssFilter(filterId, createEmptyEdits().adjustments) }}
            />
            <CountdownOverlay secondsRemaining={countdown} />
          </div>

          <FilterStrip value={filterId} onChange={setFilterId} />

          {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button size="lg" onClick={capture} disabled={stage === "capturing"} loading={stage === "capturing"}>
            <Camera className="h-4 w-4" />
            {mode === "single" ? "Capture" : "Start 3-shot strip"}
          </Button>
        </div>
      )}

      {stage === "review" && resultUrl && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt="Your captured photo" className="w-full" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={download}>
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="secondary" onClick={print}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          <Button variant="ghost" onClick={retake}>
            <RotateCcw className="h-4 w-4" />
            Retake
          </Button>

          <UpsellBanner />
        </motion.div>
      )}

      {/* Off-screen in normal view; made visible by the @media print rules
          in globals.css when the guest clicks "Print". */}
      {resultUrl && (
        <div id="print-target" className="hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="" />
        </div>
      )}
    </div>
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof ImageIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors ${
        active
          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300"
          : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
