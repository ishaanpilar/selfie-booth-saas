import type { Adjustments } from "./types";

export interface FilterPreset {
  id: string;
  label: string;
  /** CSS `filter` value — used for live preview via CSS on the <video>/<img>
   * and re-derived into canvas pixel operations at export time (see
   * `render/pixel-filters.ts`) so exported PNGs match what guests saw. */
  css: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "none", label: "Original", css: "none" },
  { id: "bw", label: "Black & White", css: "grayscale(1)" },
  { id: "sepia", label: "Sepia", css: "sepia(0.75) contrast(1.05)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.35) saturate(1.3) contrast(0.9) brightness(1.05)" },
  { id: "cool", label: "Cool", css: "saturate(1.1) hue-rotate(-8deg) brightness(1.02)" },
  { id: "warm", label: "Warm", css: "saturate(1.15) hue-rotate(8deg) brightness(1.03)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.3) brightness(0.9)" },
  { id: "pop", label: "Pop", css: "saturate(1.6) contrast(1.15)" },
];

export function getFilterPreset(id: string): FilterPreset {
  return FILTER_PRESETS.find((f) => f.id === id) ?? FILTER_PRESETS[0]!;
}

/** Combines a filter preset with manual brightness/contrast/saturation into
 * a single CSS `filter` string for live preview. */
export function buildCssFilter(filterId: string, adjustments: Adjustments): string {
  const preset = getFilterPreset(filterId);
  const parts = preset.css === "none" ? [] : [preset.css];

  if (adjustments.brightness !== 0) {
    parts.push(`brightness(${1 + adjustments.brightness / 100})`);
  }
  if (adjustments.contrast !== 0) {
    parts.push(`contrast(${1 + adjustments.contrast / 100})`);
  }
  if (adjustments.saturation !== 0) {
    parts.push(`saturate(${1 + adjustments.saturation / 100})`);
  }

  return parts.length ? parts.join(" ") : "none";
}
