"use client";

import { useEffect, useRef } from "react";
import { FilmStripRenderer } from "@selfie-booth/core/render";
import { Spinner } from "@selfie-booth/ui";
import { useBoothStore } from "@/lib/booth/booth-store";
import { uploadFilmStrip } from "@/lib/booth/booth-api";

const filmStripRenderer = new FilmStripRenderer();

/**
 * Transitional stage: composes every edited photo into the final film
 * strip via the same `FilmStripRenderer` used by the template editor's
 * preview and the lite app, uploads it, then advances to the result
 * screen. Has no interactive UI of its own — it exists so film-strip
 * rendering (which can take a beat at 300 DPI) has a dedicated loading
 * state instead of freezing the last editor screen.
 */
export function FinalizeStage() {
  const { config, selectedTemplate, sessionId, photos, setFilmStrip, setStage, setError } = useBoothStore();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !selectedTemplate || !sessionId || !config) return;
    started.current = true;

    (async () => {
      try {
        const orderedBlobs = [...photos].sort((a, b) => a.sequence - b.sequence).map((p) => p.editedBlob ?? p.originalBlob);

        const bindings = {
          "event.name": config.event.name,
          "session.date": new Date().toLocaleDateString(),
          "session.time": new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          "session.shareUrl": `${window.location.origin}/s/${sessionId}`,
          "organization.name": config.organization.name,
        };

        const result = await filmStripRenderer.render(selectedTemplate, orderedBlobs, bindings, { includeCropMarks: false });

        let filmStripId: string | null = null;
        let assetUrl: string | null = null;
        try {
          // uploadFilmStrip already swallows *network* failures itself
          // (it queues the upload offline and returns assetUrl: null so
          // the guest still gets a working local preview/print/download);
          // this catch only fires for a genuine server-side rejection.
          const uploaded = await uploadFilmStrip(sessionId, selectedTemplate.id, result.blob, {
            widthPx: result.widthPx,
            heightPx: result.heightPx,
            dpi: result.dpi,
          });
          filmStripId = uploaded.filmStripId;
          assetUrl = uploaded.assetUrl;
        } catch (err) {
          console.error("Failed to upload film strip:", err);
        }

        setFilmStrip(result.blob, filmStripId, assetUrl, { widthMm: selectedTemplate.widthMm, heightMm: selectedTemplate.heightMm, dpi: result.dpi });
        setStage("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate your film strip.");
      }
    })();
  }, [config, selectedTemplate, sessionId, photos, setFilmStrip, setStage, setError]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-slate-500 dark:text-slate-400">Putting your photos together…</p>
    </div>
  );
}
