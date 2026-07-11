/**
 * Framework-agnostic mirrors of the Prisma models. Kept separate from
 * `@selfie-booth/database`'s generated types so packages/core (which runs in
 * the browser, on booth kiosks, and inside the local print agent) never
 * needs a Prisma client or Node-only dependencies in its bundle.
 */

export type MemberRole = "OWNER" | "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";

export type EventStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "ARCHIVED" | "CANCELLED";

export type BoothStatus = "OFFLINE" | "ONLINE" | "IDLE" | "CAPTURING" | "PRINTING" | "ERROR" | "MAINTENANCE";

export type TemplateLayoutType = "STRIP_2" | "STRIP_3" | "STRIP_4" | "SINGLE" | "GRID_4" | "GRID_6" | "CUSTOM";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

export interface EventRecord {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: EventStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone: string;
  settings?: EventSettings | null;
}

export interface EventSettings {
  guestFields: Array<"name" | "email" | "phone">;
  shareEnabled: boolean;
  printEnabled: boolean;
  maxCopiesPerSession?: number;
  watermarkAssetUrl?: string;
}

export interface BoothRecord {
  id: string;
  organizationId: string;
  name: string;
  status: BoothStatus;
  kioskModeOn: boolean;
  lastHeartbeat?: string | null;
  settings?: BoothSettings | null;
}

export interface BoothSettings {
  cameraSource: "webcam" | "mobile" | "dslr";
  countdownSeconds: number;
  burstCount: number;
  defaultTemplateId?: string;
  printerId?: string;
}

export interface AssetRef {
  id: string;
  url: string;
  mimeType: string;
  widthPx?: number | null;
  heightPx?: number | null;
  dpi?: number | null;
}
