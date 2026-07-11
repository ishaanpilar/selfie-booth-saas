import type { TemplateDefinition } from "@selfie-booth/core/types";

/**
 * Hardcoded 3-shot strip layout — the lite app has no template editor or
 * database, so this is the one design it knows how to render. It reuses the
 * exact same `TemplateDefinition` shape (and the same `FilmStripRenderer`)
 * as the full platform, so a strip produced here looks identical to one
 * generated from a real Template row.
 */
export const DEFAULT_STRIP_TEMPLATE: TemplateDefinition = {
  id: "lite-strip-3",
  name: "Classic 3-Photo Strip",
  layoutType: "STRIP_3",
  widthMm: 50.8,
  heightMm: 152.4,
  dpi: 300,
  design: {
    version: 1,
    background: "#ffffff",
    bleedMm: 3,
    safeMarginMm: 3,
    slots: [
      { id: "photo-1", type: "photo", xMm: 5, yMm: 5, widthMm: 40.8, heightMm: 43.13 },
      { id: "photo-2", type: "photo", xMm: 5, yMm: 50.13, widthMm: 40.8, heightMm: 43.13 },
      { id: "photo-3", type: "photo", xMm: 5, yMm: 95.27, widthMm: 40.8, heightMm: 43.13 },
    ],
    layers: [
      {
        id: "footer-text",
        type: "text",
        text: "Selfie Booth",
        xMm: 5,
        yMm: 143,
        widthMm: 40.8,
        heightMm: 6,
        fontSize: 6,
        align: "center",
        color: "#334155",
      },
    ],
  },
};
