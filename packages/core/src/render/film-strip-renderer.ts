import type { TemplateDefinition, LayerBinding } from "../types/template";
import { pxFromMm } from "./units";
import { drawCropMarks } from "./print-marks";
import { renderQrToCanvas } from "./qr";

export type RenderBindings = Partial<Record<LayerBinding, string>>;

export interface FilmStripRenderOptions {
  /** Burns crop marks into the bleed margin; on for the print pipeline,
   * off for the on-screen "your photos are ready" preview. */
  includeCropMarks?: boolean;
}

export interface FilmStripRenderResult {
  blob: Blob;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

/**
 * Renders a `TemplateDefinition` + a set of captured photos into a single
 * flattened, print-ready PNG at the template's configured DPI (300 by
 * default). This is the one place that turns the declarative template
 * design tree into pixels — the drag-and-drop template editor edits the
 * same `TemplateDesign` JSON this class reads, so "what you designed" and
 * "what gets printed" can never drift apart.
 *
 * Bleed handling: the output canvas is `(trim + 2*bleed)` in both
 * dimensions; template-space (0,0) — where slots/layers are positioned —
 * maps to canvas pixel `(bleedPx, bleedPx)`. Anything meant to run to the
 * physical edge of the strip should be sized past the trim box into the
 * bleed area by the caller; this renderer does not auto-extend content.
 */
export class FilmStripRenderer {
  async render(template: TemplateDefinition, photos: Blob[], bindings: RenderBindings, options: FilmStripRenderOptions = {}): Promise<FilmStripRenderResult> {
    const { design, dpi } = template;
    const bleedPx = pxFromMm(design.bleedMm, dpi);
    const trimWPx = pxFromMm(template.widthMm, dpi);
    const trimHPx = pxFromMm(template.heightMm, dpi);
    const canvasW = trimWPx + bleedPx * 2;
    const canvasH = trimHPx + bleedPx * 2;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");

    // Background fills the full bleed area.
    ctx.fillStyle = design.background;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const toCanvasX = (mm: number) => bleedPx + pxFromMm(mm, dpi);
    const toCanvasY = (mm: number) => bleedPx + pxFromMm(mm, dpi);

    const photoBitmaps = await Promise.all(photos.map((blob) => createImageBitmap(blob)));
    try {
      for (const [index, slot] of design.slots.entries()) {
        const bitmap = photoBitmaps[slot.photoIndex ?? index];
        if (!bitmap) continue;

        const dx = toCanvasX(slot.xMm);
        const dy = toCanvasY(slot.yMm);
        const dw = pxFromMm(slot.widthMm, dpi);
        const dh = pxFromMm(slot.heightMm, dpi);

        ctx.save();
        if (slot.cornerRadiusMm) {
          traceRoundedRect(ctx, dx, dy, dw, dh, pxFromMm(slot.cornerRadiusMm, dpi));
          ctx.clip();
        }
        if (slot.rotationDeg) {
          ctx.translate(dx + dw / 2, dy + dh / 2);
          ctx.rotate((slot.rotationDeg * Math.PI) / 180);
          ctx.translate(-(dx + dw / 2), -(dy + dh / 2));
        }
        drawImageCover(ctx, bitmap, dx, dy, dw, dh);
        ctx.restore();
      }

      for (const layer of design.layers) {
        const dx = toCanvasX(layer.xMm);
        const dy = toCanvasY(layer.yMm);
        const dw = pxFromMm(layer.widthMm, dpi);
        const dh = pxFromMm(layer.heightMm, dpi);

        if (layer.type === "image") {
          const img = await loadImage(layer.assetUrl);
          ctx.save();
          ctx.globalAlpha = layer.opacity ?? 1;
          if (layer.rotationDeg) {
            ctx.translate(dx + dw / 2, dy + dh / 2);
            ctx.rotate((layer.rotationDeg * Math.PI) / 180);
            ctx.translate(-(dx + dw / 2), -(dy + dh / 2));
          }
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        } else if (layer.type === "text") {
          const text = layer.binding ? (bindings[layer.binding] ?? "") : resolveInlineBindings(layer.text, bindings);
          ctx.save();
          ctx.fillStyle = layer.color ?? "#000000";
          ctx.font = `${layer.fontWeight ?? 400} ${pxFromMm(layer.fontSize / 2.835, dpi)}px ${layer.fontFamily ?? "sans-serif"}`;
          ctx.textAlign = layer.align ?? "left";
          ctx.textBaseline = "middle";
          const alignX = layer.align === "center" ? dx + dw / 2 : layer.align === "right" ? dx + dw : dx;
          ctx.fillText(text, alignX, dy + dh / 2, dw);
          ctx.restore();
        } else if (layer.type === "qr") {
          const value = bindings[layer.binding] ?? "";
          if (value) {
            const qrCanvas = await renderQrToCanvas(value, Math.max(dw, dh), {
              dark: layer.foregroundColor ?? "#000000",
              light: layer.backgroundColor ?? "#ffffff",
            });
            ctx.drawImage(qrCanvas, dx, dy, dw, dh);
          }
        }
      }

      if (options.includeCropMarks) {
        drawCropMarks(ctx, template.widthMm, template.heightMm, design.bleedMm, dpi);
      }
    } finally {
      photoBitmaps.forEach((b) => b.close());
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) throw new Error("Failed to encode film strip.");

    return { blob, widthPx: canvasW, heightPx: canvasH, dpi };
  }
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, dx: number, dy: number, dw: number, dh: number): void {
  const srcAspect = img.width / img.height;
  const dstAspect = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (srcAspect > dstAspect) {
    sw = img.height * dstAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dstAspect;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function traceRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function resolveInlineBindings(text: string, bindings: RenderBindings): string {
  return text.replace(/\{\{(.*?)\}\}/g, (_, key: string) => bindings[key.trim() as LayerBinding] ?? "");
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load overlay image: ${url}`));
    img.src = url;
  });
}
