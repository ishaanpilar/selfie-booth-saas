"use client";

import { useEffect } from "react";
import { useToast } from "@selfie-booth/ui";

/**
 * Registers the service worker and surfaces an "update available" toast
 * when a new SW has installed and is waiting — kiosks run unattended for
 * hours/days, so we never auto-reload out from under an in-progress guest
 * session; the operator (or the app, between sessions) decides when to
 * activate the update.
 */
export function ServiceWorkerRegistration() {
  const { push } = useToast();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              push({
                tone: "info",
                title: "Update available",
                description: "A new version is ready. It will apply the next time this booth is idle.",
              });
            }
          });
        });
      })
      .catch((err) => console.error("Service worker registration failed:", err));

    return () => {
      void registration;
    };
  }, [push]);

  return null;
}
