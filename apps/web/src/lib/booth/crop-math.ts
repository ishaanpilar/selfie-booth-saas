import type { CropRegion, RotationDegrees } from "@selfie-booth/core/editing";

/**
 * Computes a "cover" crop rectangle (fills the target aspect ratio
 * entirely, cropping the overflow) with one degree of freedom — a `pan`
 * slider (0..1, default 0.5 = centered) along whichever axis has slack.
 * This is the standard photo-booth crop UX: guests reposition, they don't
 * fiddle with resize handles.
 *
 * `PhotoEditor` applies rotation *after* cropping (see
 * packages/core/editing/photo-editor.ts), so a rect defined here in the
 * source image's pre-rotation orientation must target the *pre-rotation*
 * aspect ratio — i.e. inverted from `targetAspect` when the photo will be
 * rotated 90/270.
 */
export function computeCoverCrop(
  sourceWidthPx: number,
  sourceHeightPx: number,
  targetAspect: number,
  rotationDeg: RotationDegrees,
  pan = 0.5,
): CropRegion {
  const rotated = rotationDeg === 90 || rotationDeg === 270;
  const cropAspect = rotated ? 1 / targetAspect : targetAspect;
  const sourceAspect = sourceWidthPx / sourceHeightPx;

  let widthPx: number;
  let heightPx: number;
  let xPx: number;
  let yPx: number;

  if (sourceAspect > cropAspect) {
    heightPx = sourceHeightPx;
    widthPx = heightPx * cropAspect;
    const maxX = sourceWidthPx - widthPx;
    xPx = maxX * clamp01(pan);
    yPx = 0;
  } else {
    widthPx = sourceWidthPx;
    heightPx = widthPx / cropAspect;
    const maxY = sourceHeightPx - heightPx;
    xPx = 0;
    yPx = maxY * clamp01(pan);
  }

  return { xPx: Math.round(xPx), yPx: Math.round(yPx), widthPx: Math.round(widthPx), heightPx: Math.round(heightPx) };
}

/** Whether this source/target combination has any slack to pan along. */
export function cropHasPanFreedom(sourceWidthPx: number, sourceHeightPx: number, targetAspect: number, rotationDeg: RotationDegrees): boolean {
  const rotated = rotationDeg === 90 || rotationDeg === 270;
  const cropAspect = rotated ? 1 / targetAspect : targetAspect;
  const sourceAspect = sourceWidthPx / sourceHeightPx;
  return Math.abs(sourceAspect - cropAspect) > 0.01;
}

/** Final canvas dimensions `PhotoEditor` will produce for this crop + rotation. */
export function finalCanvasSize(crop: CropRegion, rotationDeg: RotationDegrees): { widthPx: number; heightPx: number } {
  const rotated = rotationDeg === 90 || rotationDeg === 270;
  return rotated ? { widthPx: crop.heightPx, heightPx: crop.widthPx } : { widthPx: crop.widthPx, heightPx: crop.heightPx };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
