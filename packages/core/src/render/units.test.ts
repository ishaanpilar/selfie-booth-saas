import { describe, expect, it } from "vitest";
import { inchesFromMm, mmFromPx, pxFromMm } from "./units";

describe("pxFromMm", () => {
  it("converts a standard 2x6in strip (50.8mm) to 600px at 300 DPI", () => {
    expect(pxFromMm(50.8, 300)).toBe(600);
  });

  it("converts a 6in (152.4mm) length to 1800px at 300 DPI", () => {
    expect(pxFromMm(152.4, 300)).toBe(1800);
  });

  it("scales linearly with DPI", () => {
    expect(pxFromMm(25.4, 72)).toBe(72);
    expect(pxFromMm(25.4, 150)).toBe(150);
  });

  it("rounds to the nearest whole pixel", () => {
    // 10mm @ 300dpi = 118.11...px
    expect(pxFromMm(10, 300)).toBe(118);
  });
});

describe("mmFromPx", () => {
  it("is the inverse of pxFromMm at whole-pixel boundaries", () => {
    const px = pxFromMm(50.8, 300);
    expect(mmFromPx(px, 300)).toBeCloseTo(50.8, 1);
  });
});

describe("inchesFromMm", () => {
  it("converts 25.4mm to exactly 1 inch", () => {
    expect(inchesFromMm(25.4)).toBe(1);
  });

  it("converts 50.8mm to 2 inches", () => {
    expect(inchesFromMm(50.8)).toBe(2);
  });
});
