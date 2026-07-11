import type { TemplateLayoutType } from "./domain";

/**
 * The serialized shape stored in `Template.design` (Prisma `Json` column).
 * This is the single source of truth consumed by both the drag-and-drop
 * template editor (apps/web) and the film-strip renderer
 * (packages/core/render/film-strip-renderer.ts) — the editor never emits
 * anything the renderer can't draw, and vice versa.
 *
 * All position/size fields are in millimeters, anchored to the template's
 * top-left corner, so the same design renders correctly at any DPI.
 */

export type LayerBinding =
  | "event.name"
  | "event.date"
  | "session.date"
  | "session.time"
  | "session.shareUrl"
  | "organization.name";

export interface PhotoSlotLayer {
  id: string;
  type: "photo";
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Which captured photo (by burst sequence) fills this slot. */
  photoIndex?: number;
  rotationDeg?: number;
  cornerRadiusMm?: number;
}

export interface TextLayer {
  id: string;
  type: "text";
  text: string;
  binding?: LayerBinding;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontFamily?: string;
  fontSize: number; // pt
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
}

export interface ImageOverlayLayer {
  id: string;
  type: "image";
  assetUrl: string;
  format: "png" | "svg";
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  opacity?: number;
  rotationDeg?: number;
  /** Sponsor branding renders above photo slots but below the QR code. */
  role?: "overlay" | "sponsor";
}

export interface QrLayer {
  id: string;
  type: "qr";
  binding: LayerBinding;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  foregroundColor?: string;
  backgroundColor?: string;
}

export type TemplateLayer = PhotoSlotLayer | TextLayer | ImageOverlayLayer | QrLayer;

export interface TemplateDesign {
  version: 1;
  background: string;
  /** Extends past the trim edge so edge-to-edge printing has no white sliver. */
  bleedMm: number;
  /** Nothing meaningful should render inside this margin from the trim edge. */
  safeMarginMm: number;
  slots: PhotoSlotLayer[];
  layers: Array<TextLayer | ImageOverlayLayer | QrLayer>;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  layoutType: TemplateLayoutType;
  widthMm: number;
  heightMm: number;
  dpi: number;
  design: TemplateDesign;
}

export const PHOTO_COUNT_BY_LAYOUT: Record<TemplateLayoutType, number> = {
  STRIP_2: 2,
  STRIP_3: 3,
  STRIP_4: 4,
  SINGLE: 1,
  GRID_4: 4,
  GRID_6: 6,
  CUSTOM: 0, // determined by design.slots.length
};
