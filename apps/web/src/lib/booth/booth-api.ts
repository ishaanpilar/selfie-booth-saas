import type { CameraFrame } from "@selfie-booth/core/camera";
import type { GuestInfo } from "./booth-store";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.formErrors?.[0] ?? body.error ?? `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createBoothSession(boothId: string, eventId: string, guest: GuestInfo): Promise<string> {
  const res = await fetch(`/api/booth/${boothId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, guestName: guest.name, guestEmail: guest.email, guestPhone: guest.phone }),
  });
  const { sessionId } = await parseJsonOrThrow<{ sessionId: string }>(res);
  return sessionId;
}

export async function uploadOriginalPhoto(
  sessionId: string,
  sequence: number,
  blob: Blob,
  dims?: Pick<CameraFrame, "widthPx" | "heightPx">,
): Promise<{ photoId: string; assetUrl: string }> {
  const size = dims ?? (await blobDimensions(blob));
  const form = new FormData();
  form.append("file", blob, `photo-${sequence}.png`);
  form.append("sequence", String(sequence));
  form.append("widthPx", String(size.widthPx));
  form.append("heightPx", String(size.heightPx));

  const res = await fetch(`/api/sessions/${sessionId}/photos`, { method: "POST", body: form });
  return parseJsonOrThrow(res);
}

export async function uploadEditedPhoto(photoId: string, blob: Blob, edits: unknown): Promise<{ assetUrl: string }> {
  const size = await blobDimensions(blob);
  const form = new FormData();
  form.append("file", blob, `photo-${photoId}-edited.png`);
  form.append("widthPx", String(size.widthPx));
  form.append("heightPx", String(size.heightPx));
  form.append("edits", JSON.stringify(edits));

  const res = await fetch(`/api/photos/${photoId}`, { method: "PATCH", body: form });
  return parseJsonOrThrow(res);
}

export async function uploadFilmStrip(
  sessionId: string,
  templateId: string,
  blob: Blob,
  dims: { widthPx: number; heightPx: number; dpi: number },
): Promise<{ filmStripId: string; assetUrl: string }> {
  const form = new FormData();
  form.append("file", blob, "film-strip.png");
  form.append("templateId", templateId);
  form.append("widthPx", String(dims.widthPx));
  form.append("heightPx", String(dims.heightPx));
  form.append("dpi", String(dims.dpi));

  const res = await fetch(`/api/sessions/${sessionId}/film-strip`, { method: "POST", body: form });
  return parseJsonOrThrow(res);
}

export async function createPrintJob(params: { boothId: string; filmStripId: string; sessionId: string; copies: number }): Promise<string> {
  const res = await fetch(`/api/print-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const { jobId } = await parseJsonOrThrow<{ jobId: string }>(res);
  return jobId;
}

export async function updatePrintJobStatus(jobId: string, status: string, extra?: { attempts?: number; lastError?: string }): Promise<void> {
  await fetch(`/api/print-jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...extra }),
  });
}

export async function sendBoothHeartbeat(boothId: string, status: string): Promise<void> {
  await fetch(`/api/booth/${boothId}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).catch(() => undefined);
}

async function blobDimensions(blob: Blob): Promise<{ widthPx: number; heightPx: number }> {
  const bitmap = await createImageBitmap(blob);
  const dims = { widthPx: bitmap.width, heightPx: bitmap.height };
  bitmap.close();
  return dims;
}
