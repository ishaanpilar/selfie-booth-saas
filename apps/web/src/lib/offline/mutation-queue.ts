import { getOfflineDb, type PendingMutation, type PendingMutationType } from "./db";

type MutationHandler = (payload: Record<string, unknown>) => Promise<void>;

/**
 * Handlers are registered by booth-api.ts (one per mutation type) rather
 * than imported here, so this module never depends on booth-api.ts —
 * booth-api.ts depends on this one, not the other way around. That keeps
 * "how do we queue a write" (this file) decoupled from "what a
 * session/photo/film-strip/print-job write actually looks like on the
 * wire" (booth-api.ts).
 */
const handlers = new Map<PendingMutationType, MutationHandler>();

export function registerMutationHandler(type: PendingMutationType, handler: MutationHandler): void {
  handlers.set(type, handler);
}

const MAX_ATTEMPTS = 8;
const listeners = new Set<(pending: PendingMutation[]) => void>();

export function onQueueChange(listener: (pending: PendingMutation[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function notify(): Promise<PendingMutation[]> {
  const db = await getOfflineDb();
  const all = await db.getAll("pending-mutations");
  listeners.forEach((l) => l(all));
  return all;
}

export async function enqueueMutation(type: PendingMutationType, payload: Record<string, unknown>): Promise<void> {
  const db = await getOfflineDb();
  const mutation: PendingMutation = { id: crypto.randomUUID(), type, payload, createdAt: new Date().toISOString(), attempts: 0 };
  await db.put("pending-mutations", mutation);
  await registerBackgroundSync();
  await notify();
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await getOfflineDb();
  return db.getAll("pending-mutations");
}

let processing = false;

/**
 * Replays queued writes in the order they were made — later mutations in
 * this flow (a photo upload, a film-strip upload) reference IDs
 * (sessionId, filmStripId) that a client-generated-ID earlier mutation
 * created server-side, so a foreign-key-safe replay has to preserve that
 * order. A mutation that still fails (server unreachable, or a genuine
 * dependency that hasn't synced yet) is left in the queue and retried on
 * the next call, up to `MAX_ATTEMPTS` before being dropped so one bad
 * write can't wedge the queue forever.
 */
export async function processPendingMutations(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const db = await getOfflineDb();
    const all = (await db.getAll("pending-mutations")).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const mutation of all) {
      const handler = handlers.get(mutation.type);
      if (!handler) continue;
      try {
        await handler(mutation.payload);
        await db.delete("pending-mutations", mutation.id);
      } catch (err) {
        const attempts = mutation.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.error(`Dropping mutation ${mutation.id} (${mutation.type}) after ${attempts} failed attempts:`, err);
          await db.delete("pending-mutations", mutation.id);
        } else {
          await db.put("pending-mutations", { ...mutation, attempts });
        }
      }
    }
  } finally {
    processing = false;
    await notify();
  }
}

async function registerBackgroundSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register("selfie-booth-sync");
  } catch {
    // Background Sync is unsupported or was denied — the 'online' event
    // listener (see use-offline-sync.ts) still covers reconnect-triggered
    // replay, just without the OS waking the page in the background.
  }
}
