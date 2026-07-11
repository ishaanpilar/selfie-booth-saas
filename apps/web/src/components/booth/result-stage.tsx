"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Printer, QrCode, RotateCcw } from "lucide-react";
import { renderQrToCanvas } from "@selfie-booth/core/render";
import { Button, useToast } from "@selfie-booth/ui";
import { useBoothStore } from "@/lib/booth/booth-store";
import { createPrintJob, updatePrintJobStatus } from "@/lib/booth/booth-api";

export function ResultStage({ onStartOver }: { onStartOver: () => void }) {
  const { config, sessionId, filmStripBlob, filmStripId, filmStripAssetUrl } = useBoothStore();
  const { push } = useToast();
  const [printing, setPrinting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const imageUrl = useMemo(() => (filmStripBlob ? URL.createObjectURL(filmStripBlob) : null), [filmStripBlob]);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  useEffect(() => {
    if (!filmStripAssetUrl || !sessionId) return;
    const shareUrl = `${window.location.origin}/s/${sessionId}`;
    renderQrToCanvas(shareUrl, 240, { dark: "#0f172a", light: "#ffffff" }).then((canvas) => setQrDataUrl(canvas.toDataURL("image/png")));
  }, [filmStripAssetUrl, sessionId]);

  if (!imageUrl || !config) return null;

  const download = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${config.event.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
    a.click();
  };

  const print = async () => {
    setPrinting(true);
    let jobId: string | null = null;
    try {
      if (filmStripId) {
        // Best-effort: the DB record is what the admin dashboard's print
        // history reads. We can't observe whether the guest actually
        // completes the OS print dialog, so this is optimistic — the same
        // limitation every browser-print photo booth has.
        jobId = await createPrintJob({ boothId: config.booth.id, filmStripId, sessionId: sessionId!, copies: 1 }).catch(() => null);
      }
      window.print();
      if (jobId) await updatePrintJobStatus(jobId, "COMPLETED");
      push({ tone: "success", title: "Sent to printer" });
    } catch (err) {
      if (jobId) await updatePrintJobStatus(jobId, "FAILED", { lastError: String(err) });
      push({ tone: "error", title: "Couldn't print", description: "Try downloading instead." });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col gap-4 px-4 py-6">
      <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Your finished photo" className="w-full" />
      </div>

      {qrDataUrl && (
        <div className="mx-auto flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR code to your photo" className="h-16 w-16" />
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <p className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <QrCode className="h-3.5 w-3.5" /> Scan for your photo
            </p>
            <p>Take it home on your phone.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={download}>
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button variant="secondary" onClick={print} loading={printing} disabled={printing}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Button variant="ghost" onClick={onStartOver}>
        <RotateCcw className="h-4 w-4" />
        Done — start over
      </Button>

      {/* Hidden except under @media print (packages/ui/src/styles.css). */}
      <div id="print-target" className="hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" />
      </div>
    </motion.div>
  );
}
