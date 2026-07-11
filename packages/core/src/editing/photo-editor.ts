import { buildCssFilter } from "./filters";
import type { PhotoEdits } from "./types";

/**
 * Renders a `PhotoEdits` state onto the original source image and exports a
 * flattened PNG. Runs entirely on canvas so it produces byte-identical
 * output whether invoked from the live editor (apps/web) or a headless
 * re-render (e.g. regenerating a thumbnail after a template change).
 *
 * Color adjustments/filters reuse the browser's native `CanvasRenderingContext2D.filter`
 * (same CSS filter syntax as the live preview in editing/filters.ts) so
 * there is exactly one place — `buildCssFilter` — that defines what a given
 * filter+adjustment combination looks like.
 */
export class PhotoEditor {
  async apply(source: Blob, edits: PhotoEdits): Promise<Blob> {
    const bitmap = await createImageBitmap(source);
    try {
      const cropped = edits.crop
        ? { width: edits.crop.widthPx, height: edits.crop.heightPx }
        : { width: bitmap.width, height: bitmap.height };

      const rotated = edits.rotationDeg === 90 || edits.rotationDeg === 270;
      const canvas = document.createElement("canvas");
      canvas.width = rotated ? cropped.height : cropped.width;
      canvas.height = rotated ? cropped.width : cropped.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable.");

      ctx.save();
      ctx.filter = buildCssFilter(edits.filterId, edits.adjustments);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((edits.rotationDeg * Math.PI) / 180);

      const sx = edits.crop?.xPx ?? 0;
      const sy = edits.crop?.yPx ?? 0;
      ctx.drawImage(bitmap, sx, sy, cropped.width, cropped.height, -cropped.width / 2, -cropped.height / 2, cropped.width, cropped.height);
      ctx.restore();

      // Stickers/text are not subject to the photo's color filter.
      ctx.filter = "none";

      const stickerImages = await Promise.all(
        edits.stickers.map(async (sticker) => ({ sticker, image: await loadImage(sticker.assetUrl) })),
      );
      for (const { sticker, image } of [...stickerImages].sort((a, b) => a.sticker.zIndex - b.sticker.zIndex)) {
        ctx.save();
        ctx.globalAlpha = sticker.opacity;
        const cx = sticker.xPx + sticker.widthPx / 2;
        const cy = sticker.yPx + sticker.heightPx / 2;
        ctx.translate(cx, cy);
        ctx.rotate((sticker.rotationDeg * Math.PI) / 180);
        ctx.drawImage(image, -sticker.widthPx / 2, -sticker.heightPx / 2, sticker.widthPx, sticker.heightPx);
        ctx.restore();
      }

      for (const text of [...edits.textLayers].sort((a, b) => a.zIndex - b.zIndex)) {
        ctx.save();
        ctx.translate(text.xPx, text.yPx);
        ctx.rotate((text.rotationDeg * Math.PI) / 180);
        ctx.font = `${text.fontSize}px ${text.fontFamily}`;
        ctx.fillStyle = text.color;
        ctx.textAlign = text.align;
        ctx.textBaseline = "top";
        ctx.fillText(text.text, 0, 0);
        ctx.restore();
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
      if (!blob) throw new Error("Failed to encode edited photo.");
      return blob;
    } finally {
      bitmap.close();
    }
  }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
