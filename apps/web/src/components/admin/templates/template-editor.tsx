"use client";

import { useMemo, useRef, useState } from "react";
import { useTransition } from "react";
import { ImageIcon, QrCode, Type, Trash2, Save } from "lucide-react";
import type { TemplateDesign, TemplateLayer } from "@selfie-booth/core/types";
import { Button, FormField, Input, useToast } from "@selfie-booth/ui";
import { updateTemplateDesign } from "@/lib/admin/actions";

const PREVIEW_WIDTH_PX = 320;

export function TemplateEditor({
  templateId,
  widthMm,
  heightMm,
  initialDesign,
}: {
  templateId: string;
  widthMm: number;
  heightMm: number;
  initialDesign: TemplateDesign;
}) {
  const [design, setDesign] = useState(initialDesign);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const { push } = useToast();

  const scale = PREVIEW_WIDTH_PX / widthMm;
  const previewHeightPx = heightMm * scale;

  const allItems = useMemo(() => [...design.slots, ...design.layers], [design]);
  const selected = allItems.find((item) => item.id === selectedId) ?? null;

  const updateItem = (id: string, patch: Partial<TemplateDesign["slots"][number] | TemplateLayer>) => {
    setDesign((prev) => ({
      ...prev,
      // Only one of these two `.map` calls ever actually matches `id` for
      // a given call (a slot id and a layer id are drawn from disjoint
      // sets), but TS can't see that across two separate arrays — the
      // casts reflect that the caller (the property panel below) only
      // ever sends a slot-shaped patch when `selected` is a slot.
      slots: prev.slots.map((s) => (s.id === id ? ({ ...s, ...patch } as typeof s) : s)),
      layers: prev.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as TemplateDesign["layers"][number]) : l)),
    }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setDesign((prev) => ({
      ...prev,
      slots: prev.slots.filter((s) => s.id !== selectedId),
      layers: prev.layers.filter((l) => l.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const addLayer = (layer: TemplateDesign["layers"][number]) => {
    setDesign((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
    setSelectedId(layer.id);
  };

  const drag = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedId(id);
    const startX = e.clientX;
    const startY = e.clientY;
    const item = allItems.find((i) => i.id === id);
    if (!item) return;
    const originXMm = item.xMm;
    const originYMm = item.yMm;

    const move = (ev: PointerEvent) => {
      const deltaXMm = (ev.clientX - startX) / scale;
      const deltaYMm = (ev.clientY - startY) / scale;
      updateItem(id, { xMm: Math.max(0, originXMm + deltaXMm), yMm: Math.max(0, originYMm + deltaYMm) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const save = () => {
    startTransition(async () => {
      const result = await updateTemplateDesign(templateId, design);
      if (!result.ok) {
        push({ tone: "error", title: "Couldn't save template", description: result.error });
        return;
      }
      push({ tone: "success", title: "Template saved" });
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div>
        <div
          ref={containerRef}
          className="relative select-none overflow-hidden rounded-lg border border-slate-300 shadow-sm dark:border-slate-600"
          style={{ width: PREVIEW_WIDTH_PX, height: previewHeightPx, background: design.background }}
        >
          {design.slots.map((slot) => (
            <div
              key={slot.id}
              onPointerDown={drag(slot.id)}
              className={`absolute flex cursor-grab items-center justify-center border-2 border-dashed bg-slate-200/60 text-[10px] text-slate-500 active:cursor-grabbing dark:bg-slate-700/60 ${
                selectedId === slot.id ? "border-indigo-500" : "border-slate-400"
              }`}
              style={{ left: slot.xMm * scale, top: slot.yMm * scale, width: slot.widthMm * scale, height: slot.heightMm * scale }}
            >
              Photo {(slot.photoIndex ?? design.slots.indexOf(slot)) + 1}
            </div>
          ))}
          {design.layers.map((layer) => (
            <div
              key={layer.id}
              onPointerDown={drag(layer.id)}
              className={`absolute flex cursor-grab items-center justify-center gap-1 border bg-white/80 px-1 text-[10px] text-slate-600 active:cursor-grabbing dark:bg-slate-900/80 dark:text-slate-300 ${
                selectedId === layer.id ? "border-indigo-500" : "border-slate-300 dark:border-slate-600"
              }`}
              style={{ left: layer.xMm * scale, top: layer.yMm * scale, width: layer.widthMm * scale, height: layer.heightMm * scale }}
            >
              {layer.type === "text" && <Type className="h-3 w-3 shrink-0" />}
              {layer.type === "qr" && <QrCode className="h-3 w-3 shrink-0" />}
              {layer.type === "image" && <ImageIcon className="h-3 w-3 shrink-0" />}
              <span className="truncate">{layer.type === "text" ? layer.text : layer.type}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              addLayer({ id: crypto.randomUUID(), type: "text", text: "New text", xMm: 5, yMm: 5, widthMm: 30, heightMm: 6, fontSize: 6, align: "left" })
            }
          >
            <Type className="h-3.5 w-3.5" />
            Add text
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => addLayer({ id: crypto.randomUUID(), type: "qr", binding: "session.shareUrl", xMm: 5, yMm: 5, widthMm: 10, heightMm: 10 })}
          >
            <QrCode className="h-3.5 w-3.5" />
            Add QR code
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              addLayer({
                id: crypto.randomUUID(),
                type: "image",
                assetUrl: "",
                format: "png",
                xMm: 5,
                yMm: 5,
                widthMm: 15,
                heightMm: 15,
                role: "sponsor",
              })
            }
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Add sponsor logo
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Button onClick={save} loading={pending} disabled={pending}>
          <Save className="h-4 w-4" />
          Save changes
        </Button>

        {selected ? (
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Selected: {"type" in selected ? selected.type : "photo slot"}</h3>
              <button onClick={deleteSelected} className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="X (mm)" htmlFor="xMm">
                <Input id="xMm" type="number" value={selected.xMm} onChange={(e) => updateItem(selected.id, { xMm: Number(e.target.value) })} />
              </FormField>
              <FormField label="Y (mm)" htmlFor="yMm">
                <Input id="yMm" type="number" value={selected.yMm} onChange={(e) => updateItem(selected.id, { yMm: Number(e.target.value) })} />
              </FormField>
              <FormField label="Width (mm)" htmlFor="widthMm">
                <Input id="widthMm" type="number" value={selected.widthMm} onChange={(e) => updateItem(selected.id, { widthMm: Number(e.target.value) })} />
              </FormField>
              <FormField label="Height (mm)" htmlFor="heightMm">
                <Input id="heightMm" type="number" value={selected.heightMm} onChange={(e) => updateItem(selected.id, { heightMm: Number(e.target.value) })} />
              </FormField>
            </div>

            {"type" in selected && selected.type === "text" && (
              <>
                <FormField label="Text" htmlFor="text">
                  <Input id="text" value={selected.text} onChange={(e) => updateItem(selected.id, { text: e.target.value })} />
                </FormField>
                <FormField label="Font size (pt)" htmlFor="fontSize">
                  <Input id="fontSize" type="number" value={selected.fontSize} onChange={(e) => updateItem(selected.id, { fontSize: Number(e.target.value) })} />
                </FormField>
              </>
            )}

            {"type" in selected && selected.type === "image" && (
              <FormField label="Image URL" htmlFor="assetUrl" hint="PNG or SVG, e.g. an uploaded sponsor logo.">
                <Input id="assetUrl" value={selected.assetUrl} onChange={(e) => updateItem(selected.id, { assetUrl: e.target.value })} />
              </FormField>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Drag a slot or layer on the canvas, or select one to edit its properties.</p>
        )}
      </div>
    </div>
  );
}
