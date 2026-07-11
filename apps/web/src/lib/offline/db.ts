import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { QueuedPrintJob } from "@selfie-booth/core/printing";

/**
 * One IndexedDB database backs two concerns that both need to survive a
 * dropped connection mid-event:
 *
 *  - `pending-mutations`: booth-facing writes (create session, upload
 *    photo/edited-photo/film-strip, create/update print job) that
 *    couldn't reach the server. Blobs are stored as-is — IndexedDB
 *    supports structured-clone of Blob values natively, so no base64
 *    round-trip is needed.
 *  - `print-queue`: backs packages/core's `PrintQueueStorage` interface,
 *    so the same `PrintQueue` class used everywhere else in the app just
 *    works offline without any print-specific code here.
 */

export type PendingMutationType = "create-session" | "upload-photo" | "upload-edited-photo" | "upload-film-strip" | "create-print-job" | "update-print-job";

export interface PendingMutation {
  id: string;
  type: PendingMutationType;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

interface SelfieBoothOfflineDB extends DBSchema {
  "pending-mutations": {
    key: string;
    value: PendingMutation;
    indexes: { "by-createdAt": string };
  };
  "print-queue": {
    key: string;
    value: QueuedPrintJob;
  };
}

let dbPromise: Promise<IDBPDatabase<SelfieBoothOfflineDB>> | null = null;

export function getOfflineDb(): Promise<IDBPDatabase<SelfieBoothOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SelfieBoothOfflineDB>("selfie-booth-offline", 1, {
      upgrade(db) {
        const mutations = db.createObjectStore("pending-mutations", { keyPath: "id" });
        mutations.createIndex("by-createdAt", "createdAt");
        db.createObjectStore("print-queue", { keyPath: "jobId" });
      },
    });
  }
  return dbPromise;
}
