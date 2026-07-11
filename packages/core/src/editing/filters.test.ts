import { describe, expect, it } from "vitest";
import { buildCssFilter, getFilterPreset, FILTER_PRESETS } from "./filters";
import { DEFAULT_ADJUSTMENTS } from "./types";

describe("getFilterPreset", () => {
  it("returns the matching preset by id", () => {
    expect(getFilterPreset("sepia").label).toBe("Sepia");
  });

  it("falls back to the first preset (\"none\") for an unknown id", () => {
    expect(getFilterPreset("does-not-exist").id).toBe("none");
  });

  it("every preset id is unique", () => {
    const ids = FILTER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("buildCssFilter", () => {
  it("returns \"none\" for the none preset with default adjustments", () => {
    expect(buildCssFilter("none", DEFAULT_ADJUSTMENTS)).toBe("none");
  });

  it("returns just the preset's own filter when adjustments are all zero", () => {
    expect(buildCssFilter("bw", DEFAULT_ADJUSTMENTS)).toBe("grayscale(1)");
  });

  it("appends brightness/contrast/saturation as separate filter functions", () => {
    const result = buildCssFilter("none", { brightness: 20, contrast: -10, saturation: 50 });
    expect(result).toContain("brightness(1.2)");
    expect(result).toContain("contrast(0.9)");
    expect(result).toContain("saturate(1.5)");
  });

  it("combines a preset with adjustments in preset-first order", () => {
    const result = buildCssFilter("sepia", { brightness: 10, contrast: 0, saturation: 0 });
    expect(result.indexOf("sepia")).toBeLessThan(result.indexOf("brightness"));
  });

  it("omits an adjustment function entirely when its value is 0", () => {
    const result = buildCssFilter("none", { brightness: 0, contrast: 0, saturation: 15 });
    expect(result).not.toContain("brightness");
    expect(result).not.toContain("contrast(");
    expect(result).toContain("saturate(1.15)");
  });
});
