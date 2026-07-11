import { describe, expect, it } from "vitest";
import { computeCoverCrop, cropHasPanFreedom, finalCanvasSize } from "./crop-math";

function finalAspect(crop: ReturnType<typeof computeCoverCrop>, rotationDeg: 0 | 90 | 180 | 270): number {
  const { widthPx, heightPx } = finalCanvasSize(crop, rotationDeg);
  return widthPx / heightPx;
}

describe("computeCoverCrop", () => {
  it("crops a wider-than-target source down to the target aspect, centered by default", () => {
    // 1920x1080 source (16:9) cropped to a 3:4 portrait target.
    const crop = computeCoverCrop(1920, 1080, 3 / 4, 0, 0.5);
    expect(crop.heightPx).toBe(1080); // full height retained
    expect(crop.widthPx).toBeCloseTo(1080 * (3 / 4), 0);
    // Centered: equal slack on both sides.
    const slack = 1920 - crop.widthPx;
    expect(crop.xPx).toBeCloseTo(slack / 2, 0);
    expect(crop.yPx).toBe(0);
  });

  it("crops a taller-than-target source down to the target aspect", () => {
    // 1080x1920 source (9:16) cropped to a 4:3 landscape target.
    const crop = computeCoverCrop(1080, 1920, 4 / 3, 0, 0.5);
    expect(crop.widthPx).toBe(1080); // full width retained
    expect(crop.heightPx).toBeCloseTo(1080 / (4 / 3), 0);
    expect(crop.xPx).toBe(0);
  });

  it("pan=0 and pan=1 move the crop to opposite edges", () => {
    const start = computeCoverCrop(1920, 1080, 3 / 4, 0, 0);
    const end = computeCoverCrop(1920, 1080, 3 / 4, 0, 1);
    expect(start.xPx).toBe(0);
    expect(end.xPx).toBe(1920 - end.widthPx);
    expect(end.xPx).toBeGreaterThan(start.xPx);
  });

  it("inverts the crop-rectangle aspect pre-rotation so the POST-rotation result still matches targetAspect", () => {
    const targetAspect = 3 / 4;
    const unrotated = computeCoverCrop(1920, 1080, targetAspect, 0, 0.5);
    const rotated = computeCoverCrop(1920, 1080, targetAspect, 90, 0.5);

    // Different crop windows on the source (rotation happens *after* crop,
    // per PhotoEditor — see crop-math.ts), but both, once run through
    // finalCanvasSize for their own rotation, land on the same target
    // aspect ratio.
    expect(finalAspect(unrotated, 0)).toBeCloseTo(targetAspect, 2);
    expect(finalAspect(rotated, 90)).toBeCloseTo(targetAspect, 2);
  });

  it("produces no crop (full frame) when source and target aspects already match", () => {
    const crop = computeCoverCrop(1200, 1600, 3 / 4, 0, 0.5);
    expect(crop.widthPx).toBe(1200);
    expect(crop.heightPx).toBe(1600);
  });
});

describe("cropHasPanFreedom", () => {
  it("is false when the source already matches the target aspect", () => {
    expect(cropHasPanFreedom(1200, 1600, 3 / 4, 0)).toBe(false);
  });

  it("is true when the source aspect differs from the target", () => {
    expect(cropHasPanFreedom(1920, 1080, 3 / 4, 0)).toBe(true);
  });
});

describe("finalCanvasSize", () => {
  it("matches the crop dimensions when unrotated", () => {
    const crop = { xPx: 0, yPx: 0, widthPx: 800, heightPx: 1200 };
    expect(finalCanvasSize(crop, 0)).toEqual({ widthPx: 800, heightPx: 1200 });
  });

  it("swaps width/height for a 90 or 270 degree rotation", () => {
    const crop = { xPx: 0, yPx: 0, widthPx: 800, heightPx: 1200 };
    expect(finalCanvasSize(crop, 90)).toEqual({ widthPx: 1200, heightPx: 800 });
    expect(finalCanvasSize(crop, 270)).toEqual({ widthPx: 1200, heightPx: 800 });
  });

  it("does not swap for a 180 degree rotation", () => {
    const crop = { xPx: 0, yPx: 0, widthPx: 800, heightPx: 1200 };
    expect(finalCanvasSize(crop, 180)).toEqual({ widthPx: 800, heightPx: 1200 });
  });
});
