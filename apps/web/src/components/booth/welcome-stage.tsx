"use client";

import { motion } from "framer-motion";
import { Camera, Sparkles } from "lucide-react";
import { Button } from "@selfie-booth/ui";
import { useBoothStore } from "@/lib/booth/booth-store";
import { createBoothSession } from "@/lib/booth/booth-api";

export function WelcomeStage() {
  const { config, setStage, startSession, setError, guestInfo } = useBoothStore();
  if (!config) return null;

  const guestFields = config.event.settings?.guestFields ?? [];

  const start = async () => {
    if (guestFields.length > 0) {
      setStage("guest-form");
      return;
    }
    try {
      const sessionId = await createBoothSession(config.booth.id, config.event.id, guestInfo);
      startSession(sessionId);
      setStage("camera");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a new session.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      {config.organization.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={config.organization.logo} alt={config.organization.name} className="h-16" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white">
          <Camera className="h-8 w-8" />
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold">{config.event.name}</h1>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Sparkles className="h-4 w-4" />
          Tap below to start your photo
        </p>
      </div>

      <Button size="lg" onClick={start} className="px-10 py-6 text-lg">
        <Camera className="h-5 w-5" />
        Start
      </Button>
    </motion.div>
  );
}
