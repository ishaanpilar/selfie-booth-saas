"use client";

import { useEffect, useState } from "react";
import { renderQrToCanvas } from "@selfie-booth/core/render";
import { Copy } from "lucide-react";
import { useToast } from "@selfie-booth/ui";

export function BoothKioskQr({ boothId }: { boothId: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [kioskUrl, setKioskUrl] = useState("");
  const { push } = useToast();

  useEffect(() => {
    const url = `${window.location.origin}/booth/${boothId}`;
    setKioskUrl(url);
    renderQrToCanvas(url, 200, { dark: "#0f172a", light: "#ffffff" }).then((canvas) => setQrDataUrl(canvas.toDataURL("image/png")));
  }, [boothId]);

  const copy = async () => {
    await navigator.clipboard.writeText(kioskUrl);
    push({ tone: "success", title: "Copied kiosk link" });
  };

  return (
    <div className="flex items-center gap-4">
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="Kiosk QR code" className="h-28 w-28 rounded-lg border border-slate-200 dark:border-slate-700" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open this on the kiosk device</p>
        <button onClick={copy} className="mt-1 flex items-center gap-1.5 truncate text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          <Copy className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{kioskUrl}</span>
        </button>
      </div>
    </div>
  );
}
