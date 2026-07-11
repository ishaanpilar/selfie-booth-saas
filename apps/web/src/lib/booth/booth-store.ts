import { create } from "zustand";
import { createEmptyEdits, type PhotoEdits } from "@selfie-booth/core/editing";
import type { TemplateDefinition } from "@selfie-booth/core/types";

export type BoothStage = "welcome" | "guest-form" | "camera" | "editing" | "finalizing" | "result";

export interface CapturedPhoto {
  sequence: number;
  originalBlob: Blob;
  editedBlob: Blob | null;
  edits: PhotoEdits;
  photoId: string | null;
}

export interface BoothConfig {
  booth: { id: string; name: string; kioskModeOn: boolean; settings: { countdownSeconds?: number; burstCount?: number } | null };
  organization: { id: string; name: string; logo: string | null };
  event: {
    id: string;
    name: string;
    settings: { guestFields: Array<"name" | "email" | "phone">; shareEnabled: boolean; printEnabled: boolean; maxCopiesPerSession?: number } | null;
    templates: Array<TemplateDefinition & { isDefault: boolean }>;
  };
}

export interface GuestInfo {
  name?: string;
  email?: string;
  phone?: string;
}

interface BoothState {
  stage: BoothStage;
  config: BoothConfig | null;
  selectedTemplate: TemplateDefinition | null;
  sessionId: string | null;
  guestInfo: GuestInfo;
  photos: CapturedPhoto[];
  editingIndex: number;
  filmStripBlob: Blob | null;
  filmStripId: string | null;
  filmStripAssetUrl: string | null;
  filmStripPrintDims: { widthMm: number; heightMm: number; dpi: number } | null;
  error: string | null;

  setStage: (stage: BoothStage) => void;
  loadConfig: (config: BoothConfig) => void;
  setGuestInfo: (info: GuestInfo) => void;
  startSession: (sessionId: string) => void;
  setCapturedPhotos: (photos: CapturedPhoto[]) => void;
  updatePhotoEdits: (sequence: number, edits: PhotoEdits) => void;
  setPhotoEditedBlob: (sequence: number, blob: Blob) => void;
  setPhotoId: (sequence: number, photoId: string) => void;
  setEditingIndex: (index: number) => void;
  setFilmStrip: (blob: Blob, filmStripId: string | null, assetUrl: string | null, dims: { widthMm: number; heightMm: number; dpi: number }) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

const initialTransientState = {
  stage: "welcome" as BoothStage,
  selectedTemplate: null,
  sessionId: null,
  guestInfo: {},
  photos: [],
  editingIndex: 0,
  filmStripBlob: null,
  filmStripId: null,
  filmStripAssetUrl: null,
  filmStripPrintDims: null,
  error: null,
};

/**
 * Ephemeral, in-memory only — deliberately not persisted to
 * localStorage/IndexedDB. A guest's in-progress capture is not something
 * the next guest at this kiosk should ever be able to recover, so `reset()`
 * (called after a session completes or times out) must leave nothing
 * behind. Durable state (the uploaded assets, the DB session record) lives
 * server-side; the offline queue (Feature 6) persists only pending
 * network operations, never in-progress edit state.
 */
export const useBoothStore = create<BoothState>((set, get) => ({
  config: null,
  ...initialTransientState,

  setStage: (stage) => set({ stage }),
  loadConfig: (config) => {
    const defaultTemplate = config.event.templates.find((t) => t.isDefault) ?? config.event.templates[0] ?? null;
    set({ config, selectedTemplate: defaultTemplate });
  },
  setGuestInfo: (guestInfo) => set({ guestInfo }),
  startSession: (sessionId) => set({ sessionId }),
  setCapturedPhotos: (photos) => set({ photos, editingIndex: 0 }),
  updatePhotoEdits: (sequence, edits) =>
    set({ photos: get().photos.map((p) => (p.sequence === sequence ? { ...p, edits } : p)) }),
  setPhotoEditedBlob: (sequence, blob) =>
    set({ photos: get().photos.map((p) => (p.sequence === sequence ? { ...p, editedBlob: blob } : p)) }),
  setPhotoId: (sequence, photoId) => set({ photos: get().photos.map((p) => (p.sequence === sequence ? { ...p, photoId } : p)) }),
  setEditingIndex: (editingIndex) => set({ editingIndex }),
  setFilmStrip: (filmStripBlob, filmStripId, filmStripAssetUrl, dims) =>
    set({ filmStripBlob, filmStripId, filmStripAssetUrl, filmStripPrintDims: dims }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialTransientState }),
}));

export function createCapturedPhoto(sequence: number, blob: Blob): CapturedPhoto {
  return { sequence, originalBlob: blob, editedBlob: null, edits: createEmptyEdits(), photoId: null };
}
