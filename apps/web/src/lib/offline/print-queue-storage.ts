import type { PrintQueueStorage, QueuedPrintJob } from "@selfie-booth/core/printing";
import { getOfflineDb } from "./db";

/** IndexedDB-backed implementation of packages/core's `PrintQueueStorage`
 * seam — the only browser-storage-specific code the print queue needs,
 * kept out of packages/core so that package stays usable in non-browser
 * contexts (tests, the print agent) too. */
export class IndexedDbPrintQueueStorage implements PrintQueueStorage {
  async save(job: QueuedPrintJob): Promise<void> {
    const db = await getOfflineDb();
    await db.put("print-queue", job);
  }

  async update(jobId: string, patch: Partial<QueuedPrintJob>): Promise<void> {
    const db = await getOfflineDb();
    const existing = await db.get("print-queue", jobId);
    if (existing) {
      await db.put("print-queue", { ...existing, ...patch, updatedAt: new Date().toISOString() });
    }
  }

  async getAll(): Promise<QueuedPrintJob[]> {
    const db = await getOfflineDb();
    return db.getAll("print-queue");
  }

  async remove(jobId: string): Promise<void> {
    const db = await getOfflineDb();
    await db.delete("print-queue", jobId);
  }
}
