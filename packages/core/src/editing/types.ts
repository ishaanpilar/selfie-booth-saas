/**
 * Non-destructive edit state: we always keep the original `Photo.originalAsset`
 * untouched and store this structure in `Photo.edits`. The editor re-applies
 * it to the original on every render, so undo/redo and "reset to original"
 * are free (just clear/rewind this object) and re-editing never compounds
 * lossy operations on top of a previously-edited JPEG/PNG.
 */
export interface CropRegion {
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
}

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface Adjustments {
  /** -100..100, 0 = unchanged */
  brightness: number;
  /** -100..100, 0 = unchanged */
  contrast: number;
  /** -100..100, 0 = unchanged */
  saturation: number;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, saturation: 0 };

export interface StickerInstance {
  id: string;
  assetUrl: string;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  rotationDeg: number;
  opacity: number;
  zIndex: number;
}

export interface TextInstance {
  id: string;
  text: string;
  xPx: number;
  yPx: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotationDeg: number;
  align: "left" | "center" | "right";
  zIndex: number;
}

export interface PhotoEdits {
  crop?: CropRegion;
  rotationDeg: RotationDegrees;
  adjustments: Adjustments;
  filterId: string;
  stickers: StickerInstance[];
  textLayers: TextInstance[];
}

export function createEmptyEdits(): PhotoEdits {
  return {
    rotationDeg: 0,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filterId: "none",
    stickers: [],
    textLayers: [],
  };
}
