import type { GuestInfo } from "./booth-store";
import { enqueueMutation, registerMutationHandler } from "@/lib/offline/mutation-queue";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.formErrors?.[0] ?? body.error ?? `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function blobDimensions(blob: Blob): Promise<{ widthPx: number; heightPx: number }> {
  const bitmap = await createImageBitmap(blob);
  const dims = { widthPx: bitmap.width, heightPx: bitmap.height };
  bitmap.close();
  return dims;
}

/**
 * Distinguishes "the network is down" (queue it, replay later) from "the
 * server rejected this request" (a real error — queuing a request the
 * server has already told us is invalid would just fail identically on
 * every future retry). `fetch` itself only throws for the former; an
 * HTTP error status is surfaced by `parseJsonOrThrow` throwing an `Error`
 * whose message came from the server, not a raw `TypeError`.
 */
function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

interface CreateSessionPayload {
  id: string;
  boothId: string;
  eventId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

async function sendCreateSession(payload: CreateSessionPayload): Promise<void> {
  const res = await fetch(`/api/booth/${payload.boothId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: payload.id, eventId: payload.eventId, guestName: payload.guestName, guestEmail: payload.guestEmail, guestPhone: payload.guestPhone }),
  });
  await parseJsonOrThrow(res);
}
registerMutationHandler("create-session", (payload) => sendCreateSession(payload as unknown as CreateSessionPayload));

/** Always returns immediately with a usable session id — generated
 * client-side rather than waiting on the server, so a booth with no
 * connectivity can still start a guest session. */
export async function createBoothSession(boothId: string, eventId: string, guest: GuestInfo): Promise<string> {
  const payload: CreateSessionPayload = { id: crypto.randomUUID(), boothId, eventId, guestName: guest.name, guestEmail: guest.email, guestPhone: guest.phone };
  try {
    await sendCreateSession(payload);
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    await enqueueMutation("create-session", payload as unknown as Record<string, unknown>);
  }
  return payload.id;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

interface UploadPhotoPayload {
  sessionId: string;
  photoId: string;
  sequence: number;
  blob: Blob;
  widthPx: number;
  heightPx: number;
}

async function sendUploadOriginalPhoto(payload: UploadPhotoPayload): Promise<void> {
  const form = new FormData();
  form.append("file", payload.blob, `photo-${payload.sequence}.png`);
  form.append("photoId", payload.photoId);
  form.append("sequence", String(payload.sequence));
  form.append("widthPx", String(payload.widthPx));
  form.append("heightPx", String(payload.heightPx));

  const res = await fetch(`/api/sessions/${payload.sessionId}/photos`, { method: "POST", body: form });
  await parseJsonOrThrow(res);
}
registerMutationHandler("upload-photo", (payload) => sendUploadOriginalPhoto(payload as unknown as UploadPhotoPayload));

export async function uploadOriginalPhoto(sessionId: string, photoId: string, sequence: number, blob: Blob): Promise<void> {
  const { widthPx, heightPx } = await blobDimensions(blob);
  const payload: UploadPhotoPayload = { sessionId, photoId, sequence, blob, widthPx, heightPx };
  try {
    await sendUploadOriginalPhoto(payload);
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    await enqueueMutation("upload-photo", payload as unknown as Record<string, unknown>);
  }
}

interface UploadEditedPhotoPayload {
  photoId: string;
  blob: Blob;
  widthPx: number;
  heightPx: number;
  edits: unknown;
}

async function sendUploadEditedPhoto(payload: UploadEditedPhotoPayload): Promise<void> {
  const form = new FormData();
  form.append("file", payload.blob, `photo-${payload.photoId}-edited.png`);
  form.append("widthPx", String(payload.widthPx));
  form.append("heightPx", String(payload.heightPx));
  form.append("edits", JSON.stringify(payload.edits));

  const res = await fetch(`/api/photos/${payload.photoId}`, { method: "PATCH", body: form });
  await parseJsonOrThrow(res);
}
registerMutationHandler("upload-edited-photo", (payload) => sendUploadEditedPhoto(payload as unknown as UploadEditedPhotoPayload));

export async function uploadEditedPhoto(photoId: string, blob: Blob, edits: unknown): Promise<void> {
  const { widthPx, heightPx } = await blobDimensions(blob);
  const payload: UploadEditedPhotoPayload = { photoId, blob, widthPx, heightPx, edits };
  try {
    await sendUploadEditedPhoto(payload);
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    await enqueueMutation("upload-edited-photo", payload as unknown as Record<string, unknown>);
  }
}

// ---------------------------------------------------------------------------
// Film strips
// ---------------------------------------------------------------------------

interface UploadFilmStripPayload {
  id: string;
  sessionId: string;
  templateId: string;
  blob: Blob;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

async function sendUploadFilmStrip(payload: UploadFilmStripPayload): Promise<{ assetUrl: string }> {
  const form = new FormData();
  form.append("file", payload.blob, "film-strip.png");
  form.append("filmStripId", payload.id);
  form.append("templateId", payload.templateId);
  form.append("widthPx", String(payload.widthPx));
  form.append("heightPx", String(payload.heightPx));
  form.append("dpi", String(payload.dpi));

  const res = await fetch(`/api/sessions/${payload.sessionId}/film-strip`, { method: "POST", body: form });
  return parseJsonOrThrow(res);
}
registerMutationHandler("upload-film-strip", async (payload) => {
  await sendUploadFilmStrip(payload as unknown as UploadFilmStripPayload);
});

/** `assetUrl` is `null` when the upload had to be queued for later — the
 * guest still sees/prints/downloads their photo from the local blob
 * (see finalize-stage.tsx), they just don't get a working share QR code
 * until this syncs. */
export async function uploadFilmStrip(
  sessionId: string,
  templateId: string,
  blob: Blob,
  dims: { widthPx: number; heightPx: number; dpi: number },
): Promise<{ filmStripId: string; assetUrl: string | null }> {
  const payload: UploadFilmStripPayload = { id: crypto.randomUUID(), sessionId, templateId, blob, ...dims };
  try {
    const { assetUrl } = await sendUploadFilmStrip(payload);
    return { filmStripId: payload.id, assetUrl };
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    await enqueueMutation("upload-film-strip", payload as unknown as Record<string, unknown>);
    return { filmStripId: payload.id, assetUrl: null };
  }
}

// ---------------------------------------------------------------------------
// Print jobs
// ---------------------------------------------------------------------------

interface CreatePrintJobPayload {
  id: string;
  boothId: string;
  filmStripId: string;
  sessionId: string;
  copies: number;
}

async function sendCreatePrintJob(payload: CreatePrintJobPayload): Promise<void> {
  const res = await fetch(`/api/print-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await parseJsonOrThrow(res);
}
registerMutationHandler("create-print-job", (payload) => sendCreatePrintJob(payload as unknown as CreatePrintJobPayload));

export async function createPrintJob(params: { boothId: string; filmStripId: string; sessionId: string; copies: number }): Promise<string> {
  const payload: CreatePrintJobPayload = { id: crypto.randomUUID(), ...params };
  try {
    await sendCreatePrintJob(payload);
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    await enqueueMutation("create-print-job", payload as unknown as Record<string, unknown>);
  }
  return payload.id;
}

interface UpdatePrintJobPayload {
  jobId: string;
  status: string;
  attempts?: number;
  lastError?: string;
}

async function sendUpdatePrintJobStatus(payload: UpdatePrintJobPayload): Promise<void> {
  const res = await fetch(`/api/print-jobs/${payload.jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: payload.status, attempts: payload.attempts, lastError: payload.lastError }),
  });
  await parseJsonOrThrow(res);
}
registerMutationHandler("update-print-job", (payload) => sendUpdatePrintJobStatus(payload as unknown as UpdatePrintJobPayload));

export async function updatePrintJobStatus(jobId: string, status: string, extra?: { attempts?: number; lastError?: string }): Promise<void> {
  const payload: UpdatePrintJobPayload = { jobId, status, ...extra };
  try {
    await sendUpdatePrintJobStatus(payload);
  } catch (err) {
    if (!isNetworkFailure(err)) return; // best-effort telemetry; a real server rejection isn't worth surfacing to the guest
    await enqueueMutation("update-print-job", payload as unknown as Record<string, unknown>);
  }
}

// ---------------------------------------------------------------------------
// Heartbeat — intentionally NOT queued: a stale "I was online 10 minutes
// ago" heartbeat replayed after reconnecting would misreport booth health.
// ---------------------------------------------------------------------------

export async function sendBoothHeartbeat(boothId: string, status: string): Promise<void> {
  await fetch(`/api/booth/${boothId}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).catch(() => undefined);
}
