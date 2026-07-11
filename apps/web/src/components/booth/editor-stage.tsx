"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crop, RotateCw, Sticker, Type, Trash2, ArrowRight } from "lucide-react";
import { PhotoEditor, createEmptyEdits, type PhotoEdits, type StickerInstance, type TextInstance } from "@selfie-booth/core/editing";
import { Button, Dialog, FilterStrip, FormField, Input, Tabs, TabsList, TabsTrigger, TabsContent } from "@selfie-booth/ui";
import { useBoothStore } from "@/lib/booth/booth-store";
import { uploadEditedPhoto } from "@/lib/booth/booth-api";
import { computeCoverCrop, finalCanvasSize } from "@/lib/booth/crop-math";
import { STICKER_PACK } from "@/lib/booth/stickers";

const photoEditor = new PhotoEditor();

/** UI-local layer state uses percentages of the final (post-crop/rotate)
 * canvas rather than pixels, so dragging never needs to measure the
 * rendered preview's actual on-screen size — only `finalCanvasSize` (known
 * from the crop math) is needed to convert to real pixels at bake time. */
interface PctSticker extends Omit<StickerInstance, "xPx" | "yPx" | "widthPx" | "heightPx"> {
  xPct: number;
  yPct: number;
  sizePct: number;
}
interface PctText extends Omit<TextInstance, "xPx" | "yPx" | "fontSize"> {
  xPct: number;
  yPct: number;
  fontSizePct: number;
}

export function EditorStage() {
  const { selectedTemplate, photos, editingIndex, updatePhotoEdits, setPhotoEditedBlob, setEditingIndex, setStage, setError } = useBoothStore();
  const photo = photos[editingIndex];

  const [rotationDeg, setRotationDeg] = useState<PhotoEdits["rotationDeg"]>(photo?.edits.rotationDeg ?? 0);
  const [filterId, setFilterId] = useState(photo?.edits.filterId ?? "none");
  const [adjustments, setAdjustments] = useState(photo?.edits.adjustments ?? createEmptyEdits().adjustments);
  const [pan, setPan] = useState(0.5);
  const [stickers, setStickers] = useState<PctSticker[]>([]);
  const [texts, setTexts] = useState<PctText[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [sourceDims, setSourceDims] = useState<{ width: number; height: number } | null>(null);
  const [basePreviewUrl, setBasePreviewUrl] = useState<string | null>(null);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shotCount = photos.length;
  const isLastPhoto = editingIndex === shotCount - 1;

  // Reset local editor state whenever the active photo changes.
  useEffect(() => {
    if (!photo) return;
    setRotationDeg(photo.edits.rotationDeg);
    setFilterId(photo.edits.filterId);
    setAdjustments(photo.edits.adjustments);
    setPan(0.5);
    setStickers([]);
    setTexts([]);
    setSelectedLayerId(null);
    let cancelled = false;
    createImageBitmap(photo.originalBlob).then((bmp) => {
      if (cancelled) return;
      setSourceDims({ width: bmp.width, height: bmp.height });
      bmp.close();
    });
    return () => {
      cancelled = true;
    };
  }, [photo]);

  const targetAspect = useMemo(() => {
    const slot = selectedTemplate?.design.slots[editingIndex] ?? selectedTemplate?.design.slots[0];
    return slot ? slot.widthMm / slot.heightMm : 3 / 4;
  }, [selectedTemplate, editingIndex]);

  const crop = useMemo(() => {
    if (!sourceDims) return null;
    return computeCoverCrop(sourceDims.width, sourceDims.height, targetAspect, rotationDeg, pan);
  }, [sourceDims, targetAspect, rotationDeg, pan]);

  const finalSize = crop ? finalCanvasSize(crop, rotationDeg) : null;

  // Debounced base preview: crop + rotation + filter + adjustments only.
  // Stickers/text stay as live DOM overlays until this photo is confirmed.
  useEffect(() => {
    if (!photo || !crop) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const blob = await photoEditor.apply(photo.originalBlob, {
        rotationDeg,
        adjustments,
        filterId,
        crop,
        stickers: [],
        textLayers: [],
      });
      if (cancelled) return;
      setBasePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, crop?.xPx, crop?.yPx, crop?.widthPx, crop?.heightPx, rotationDeg, filterId, adjustments]);

  const addSticker = useCallback((assetUrl: string) => {
    const id = crypto.randomUUID();
    setStickers((prev) => [...prev, { id, assetUrl, xPct: 50, yPct: 50, sizePct: 20, rotationDeg: 0, opacity: 1, zIndex: prev.length }]);
    setSelectedLayerId(id);
  }, []);

  const confirmText = useCallback(() => {
    if (!textDraft.trim()) {
      setTextDialogOpen(false);
      return;
    }
    const id = crypto.randomUUID();
    setTexts((prev) => [
      ...prev,
      { id, text: textDraft.trim(), xPct: 50, yPct: 50, fontSizePct: 6, fontFamily: "sans-serif", color: "#ffffff", rotationDeg: 0, align: "center", zIndex: prev.length },
    ]);
    setSelectedLayerId(id);
    setTextDraft("");
    setTextDialogOpen(false);
  }, [textDraft]);

  const deleteSelected = useCallback(() => {
    setStickers((prev) => prev.filter((s) => s.id !== selectedLayerId));
    setTexts((prev) => prev.filter((t) => t.id !== selectedLayerId));
    setSelectedLayerId(null);
  }, [selectedLayerId]);

  const dragLayer = useCallback(
    (id: string, kind: "sticker" | "text") => (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectedLayerId(id);
      const container = containerRef.current;
      if (!container) return;

      const move = (ev: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const xPct = clamp(((ev.clientX - rect.left) / rect.width) * 100, 0, 100);
        const yPct = clamp(((ev.clientY - rect.top) / rect.height) * 100, 0, 100);
        if (kind === "sticker") {
          setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, xPct, yPct } : s)));
        } else {
          setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, xPct, yPct } : t)));
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [],
  );

  const confirmPhoto = useCallback(async () => {
    if (!photo || !crop || !finalSize) return;
    setSaving(true);
    setError(null);

    try {
      const stickerInstances: StickerInstance[] = stickers.map((s) => {
        const sizePx = (s.sizePct / 100) * Math.min(finalSize.widthPx, finalSize.heightPx);
        return {
          id: s.id,
          assetUrl: s.assetUrl,
          widthPx: sizePx,
          heightPx: sizePx,
          xPx: (s.xPct / 100) * finalSize.widthPx - sizePx / 2,
          yPx: (s.yPct / 100) * finalSize.heightPx - sizePx / 2,
          rotationDeg: s.rotationDeg,
          opacity: s.opacity,
          zIndex: s.zIndex,
        };
      });
      const textInstances: TextInstance[] = texts.map((t) => ({
        id: t.id,
        text: t.text,
        xPx: (t.xPct / 100) * finalSize.widthPx,
        yPx: (t.yPct / 100) * finalSize.heightPx,
        fontSize: (t.fontSizePct / 100) * finalSize.heightPx,
        fontFamily: t.fontFamily,
        color: t.color,
        rotationDeg: t.rotationDeg,
        align: t.align,
        zIndex: t.zIndex,
      }));

      const edits: PhotoEdits = { rotationDeg, adjustments, filterId, crop, stickers: stickerInstances, textLayers: textInstances };
      const finalBlob = await photoEditor.apply(photo.originalBlob, edits);

      updatePhotoEdits(photo.sequence, edits);
      setPhotoEditedBlob(photo.sequence, finalBlob);

      if (photo.photoId) {
        void uploadEditedPhoto(photo.photoId, finalBlob, edits).catch((err) => console.error("Failed to upload edited photo:", err));
      }

      if (isLastPhoto) {
        setStage("finalizing");
      } else {
        setEditingIndex(editingIndex + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save this photo's edits.");
    } finally {
      setSaving(false);
    }
  }, [photo, crop, finalSize, stickers, texts, rotationDeg, adjustments, filterId, updatePhotoEdits, setPhotoEditedBlob, isLastPhoto, setStage, setEditingIndex, editingIndex, setError]);

  if (!photo || !finalSize) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6">
      {shotCount > 1 && (
        <div className="flex justify-center gap-1.5">
          {photos.map((_, i) => (
            <span key={i} className={`h-1.5 w-8 rounded-full ${i === editingIndex ? "bg-indigo-600" : i < editingIndex ? "bg-indigo-300" : "bg-slate-200 dark:bg-slate-700"}`} />
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-sm select-none overflow-hidden rounded-2xl bg-slate-900"
        style={{ aspectRatio: `${finalSize.widthPx} / ${finalSize.heightPx}` }}
      >
        {basePreviewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={basePreviewUrl} alt="Editing preview" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        )}

        {stickers.map((s) => (
          <div
            key={s.id}
            onPointerDown={dragLayer(s.id, "sticker")}
            className="absolute flex cursor-grab items-center justify-center active:cursor-grabbing"
            style={{
              left: `${s.xPct}%`,
              top: `${s.yPct}%`,
              width: `${s.sizePct}%`,
              aspectRatio: "1 / 1",
              transform: `translate(-50%, -50%) rotate(${s.rotationDeg}deg)`,
              outline: selectedLayerId === s.id ? "2px solid #6366f1" : "none",
              outlineOffset: 2,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.assetUrl} alt="" className="h-full w-full" draggable={false} />
          </div>
        ))}

        {texts.map((t) => (
          <div
            key={t.id}
            onPointerDown={dragLayer(t.id, "text")}
            className="absolute max-w-[80%] cursor-grab whitespace-nowrap font-semibold active:cursor-grabbing"
            style={{
              left: `${t.xPct}%`,
              top: `${t.yPct}%`,
              color: t.color,
              fontSize: `${t.fontSizePct}%`,
              transform: `translate(${t.align === "center" ? "-50%" : t.align === "right" ? "-100%" : "0"}, -50%) rotate(${t.rotationDeg}deg)`,
              textAlign: t.align,
              outline: selectedLayerId === t.id ? "2px solid #6366f1" : "none",
              outlineOffset: 2,
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {t.text}
          </div>
        ))}
      </div>

      {selectedLayerId && (
        <button onClick={deleteSelected} className="mx-auto flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <Trash2 className="h-3.5 w-3.5" />
          Remove selected
        </button>
      )}

      <Tabs defaultValue="filter">
        <TabsList className="w-full justify-center">
          <TabsTrigger value="filter">Filter</TabsTrigger>
          <TabsTrigger value="adjust">Adjust</TabsTrigger>
          <TabsTrigger value="crop">
            <Crop className="mr-1 h-3.5 w-3.5" />
            Crop
          </TabsTrigger>
          <TabsTrigger value="stickers">
            <Sticker className="mr-1 h-3.5 w-3.5" />
            Stickers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filter">
          <FilterStrip value={filterId} onChange={setFilterId} />
        </TabsContent>

        <TabsContent value="adjust" className="space-y-3">
          <AdjustSlider label="Brightness" value={adjustments.brightness} onChange={(v) => setAdjustments({ ...adjustments, brightness: v })} />
          <AdjustSlider label="Contrast" value={adjustments.contrast} onChange={(v) => setAdjustments({ ...adjustments, contrast: v })} />
          <AdjustSlider label="Saturation" value={adjustments.saturation} onChange={(v) => setAdjustments({ ...adjustments, saturation: v })} />
        </TabsContent>

        <TabsContent value="crop" className="space-y-3">
          <Button variant="secondary" size="sm" onClick={() => setRotationDeg(((rotationDeg + 90) % 360) as PhotoEdits["rotationDeg"])}>
            <RotateCw className="h-4 w-4" />
            Rotate 90°
          </Button>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Reposition
            <input type="range" min={0} max={100} value={pan * 100} onChange={(e) => setPan(Number(e.target.value) / 100)} className="mt-1 w-full accent-indigo-600" />
          </label>
        </TabsContent>

        <TabsContent value="stickers" className="space-y-3">
          <div className="grid grid-cols-6 gap-2">
            {STICKER_PACK.map((sticker) => (
              <button key={sticker.id} onClick={() => addSticker(sticker.assetUrl)} className="rounded-lg border border-slate-200 p-1.5 hover:border-indigo-400 dark:border-slate-700" aria-label={`Add ${sticker.label} sticker`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sticker.assetUrl} alt="" className="h-8 w-8" />
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setTextDialogOpen(true)}>
            <Type className="h-4 w-4" />
            Add text
          </Button>
        </TabsContent>
      </Tabs>

      <Button size="lg" onClick={confirmPhoto} loading={saving} disabled={saving}>
        {isLastPhoto ? "Continue" : "Next photo"}
        <ArrowRight className="h-4 w-4" />
      </Button>

      <Dialog open={textDialogOpen} onClose={() => setTextDialogOpen(false)} title="Add text">
        <div className="space-y-4">
          <FormField label="Text" htmlFor="text-draft">
            <Input id="text-draft" value={textDraft} onChange={(e) => setTextDraft(e.target.value)} maxLength={60} autoFocus />
          </FormField>
          <Button className="w-full" onClick={confirmText}>
            Add
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function AdjustSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <input type="range" min={-100} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-indigo-600" />
    </label>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
