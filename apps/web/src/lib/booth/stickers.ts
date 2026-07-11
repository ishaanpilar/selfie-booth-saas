/**
 * A small built-in sticker pack rendered as inline SVG data URIs, so the
 * editor works with zero binary asset files or CDN dependency. Each entry
 * satisfies `StickerInstance.assetUrl` from packages/core/editing — the
 * renderer just draws whatever image URL it's given, so swapping these for
 * uploaded PNG/SVG sponsor assets later is a data change, not a code one.
 */
export interface StickerDefinition {
  id: string;
  label: string;
  assetUrl: string;
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const STICKER_SVGS: Record<string, string> = {
  heart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 56S6 40 6 22a14 14 0 0126-8 14 14 0 0126 8c0 18-26 34-26 34z" fill="#ef4444"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 4l8.5 18.2L60 25l-14 13.6L49.4 60 32 49.8 14.6 60 18 38.6 4 25l19.5-2.8z" fill="#facc15"/></svg>`,
  sparkle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 2c2 14 6 18 20 20-14 2-18 6-20 20-2-14-6-18-20-20 14-2 18-6 20-20z" fill="#a78bfa"/></svg>`,
  crown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M6 46l4-24 12 12 10-18 10 18 12-12 4 24z" fill="#f59e0b"/><rect x="6" y="46" width="52" height="8" rx="2" fill="#f59e0b"/></svg>`,
  sunglasses: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="26" width="24" height="16" rx="6" fill="#0f172a"/><rect x="36" y="26" width="24" height="16" rx="6" fill="#0f172a"/><rect x="28" y="30" width="8" height="4" fill="#0f172a"/></svg>`,
  "thumbs-up": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M8 28h10v28H8zM22 28l8-20a6 6 0 016 6v10h18a6 6 0 016 7l-4 18a6 6 0 01-6 5H22z" fill="#22c55e"/></svg>`,
};

export const STICKER_PACK: StickerDefinition[] = [
  { id: "heart", label: "Heart", assetUrl: svgToDataUrl(STICKER_SVGS.heart!) },
  { id: "star", label: "Star", assetUrl: svgToDataUrl(STICKER_SVGS.star!) },
  { id: "sparkle", label: "Sparkle", assetUrl: svgToDataUrl(STICKER_SVGS.sparkle!) },
  { id: "crown", label: "Crown", assetUrl: svgToDataUrl(STICKER_SVGS.crown!) },
  { id: "sunglasses", label: "Sunglasses", assetUrl: svgToDataUrl(STICKER_SVGS.sunglasses!) },
  { id: "thumbs-up", label: "Thumbs up", assetUrl: svgToDataUrl(STICKER_SVGS["thumbs-up"]!) },
];
