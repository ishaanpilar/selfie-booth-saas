"use client";

import { useEffect, useState } from "react";
import { getPendingMutations, onQueueChange, processPendingMutations } from "./mutation-queue";
// Side-effect import: booth-api.ts registers its mutation replay handlers
// (registerMutationHandler(...)) at module load. Importing it here — even
// though nothing below references it directly — guarantees those handlers
// exist before processPendingMutations() can run.
import "@/lib/booth/booth-api";

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
}

/**
 * Drives the offline queue's lifecycle for whatever component mounts it
 * (the booth experience): replays on mount (covers a page reload with
 * leftover queued writes), on the browser's `online` event, and on a
 * `SYNC_REQUESTED` message from the service worker's Background Sync
 * handler (see public/sw.js) — three different ways connectivity can come
 * back, all funneling into the same `processPendingMutations()` call.
 */
export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    getPendingMutations().then((pending) => setPendingCount(pending.length));

    const unsubscribe = onQueueChange((pending) => setPendingCount(pending.length));

    const handleOnline = () => {
      setIsOnline(true);
      void processPendingMutations();
    };
    const handleOffline = () => setIsOnline(false);
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_REQUESTED") void processPendingMutations();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    if (navigator.onLine) void processPendingMutations();

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  return { isOnline, pendingCount };
}
