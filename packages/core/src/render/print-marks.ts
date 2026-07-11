import { pxFromMm } from "./units";

const CROP_MARK_LENGTH_MM = 3;
const CROP_MARK_OFFSET_MM = 1; // gap between trim edge and where the mark starts
const CROP_MARK_STROKE_MM = 0.1;

/**
 * Draws standard printer's crop marks at the four corners of the trim box.
 * Marks live in the bleed margin and point outward, matching the convention
 * every commercial print shop / RIP software expects.
 */
export function drawCropMarks(ctx: CanvasRenderingContext2D, trimWidthMm: number, trimHeightMm: number, bleedMm: number, dpi: number): void {
  const len = pxFromMm(CROP_MARK_LENGTH_MM, dpi);
  const offset = pxFromMm(CROP_MARK_OFFSET_MM, dpi);
  const bleedPx = pxFromMm(bleedMm, dpi);
  const trimWPx = pxFromMm(trimWidthMm, dpi);
  const trimHPx = pxFromMm(trimHeightMm, dpi);

  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(1, pxFromMm(CROP_MARK_STROKE_MM, dpi));

  const corners: Array<{ x: number; y: number; hDir: 1 | -1; vDir: 1 | -1 }> = [
    { x: bleedPx, y: bleedPx, hDir: -1, vDir: -1 },
    { x: bleedPx + trimWPx, y: bleedPx, hDir: 1, vDir: -1 },
    { x: bleedPx, y: bleedPx + trimHPx, hDir: -1, vDir: 1 },
    { x: bleedPx + trimWPx, y: bleedPx + trimHPx, hDir: 1, vDir: 1 },
  ];

  for (const c of corners) {
    // Horizontal mark
    ctx.beginPath();
    ctx.moveTo(c.x + c.hDir * offset, c.y);
    ctx.lineTo(c.x + c.hDir * (offset + len), c.y);
    ctx.stroke();
    // Vertical mark
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + c.vDir * offset);
    ctx.lineTo(c.x, c.y + c.vDir * (offset + len));
    ctx.stroke();
  }
  ctx.restore();
}

/** Non-printing guide outline for the safe margin, useful in the template
 * editor's canvas preview; never drawn on the actual export. */
export function drawSafeMarginGuide(ctx: CanvasRenderingContext2D, trimWidthMm: number, trimHeightMm: number, bleedMm: number, safeMarginMm: number, dpi: number): void {
  const bleedPx = pxFromMm(bleedMm, dpi);
  const marginPx = pxFromMm(safeMarginMm, dpi);
  const trimWPx = pxFromMm(trimWidthMm, dpi);
  const trimHPx = pxFromMm(trimHeightMm, dpi);

  ctx.save();
  ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
  ctx.setLineDash([pxFromMm(2, dpi), pxFromMm(2, dpi)]);
  ctx.lineWidth = 1;
  ctx.strokeRect(bleedPx + marginPx, bleedPx + marginPx, trimWPx - marginPx * 2, trimHPx - marginPx * 2);
  ctx.restore();
}
