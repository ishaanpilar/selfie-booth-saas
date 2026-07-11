"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useBoothStore, type BoothConfig } from "@/lib/booth/booth-store";
import { sendBoothHeartbeat } from "@/lib/booth/booth-api";
import { WelcomeStage } from "./welcome-stage";
import { GuestFormStage } from "./guest-form-stage";
import { CameraStage } from "./camera-stage";
import { EditorStage } from "./editor-stage";
import { FinalizeStage } from "./finalize-stage";
import { ResultStage } from "./result-stage";

const HEARTBEAT_INTERVAL_MS = 30_000;

/** Maps the guest-facing wizard stage to the `BoothStatus` enum the admin
 * dashboard's device-health panel reads — coarse but honest: a kiosk mid
 * capture/edit/print is meaningfully different from one just sitting idle
 * at the welcome screen. */
function boothStatusForStage(stage: ReturnType<typeof useBoothStore.getState>["stage"]): string {
  switch (stage) {
    case "camera":
      return "CAPTURING";
    case "editing":
    case "finalizing":
    case "result":
      return "PRINTING";
    default:
      return "IDLE";
  }
}

export function BoothExperience({ initialConfig }: { initialConfig: BoothConfig }) {
  const { config, stage, error, loadConfig, reset, setStage } = useBoothStore();

  useEffect(() => {
    loadConfig(initialConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConfig.booth.id]);

  useEffect(() => {
    if (!config) return;
    const send = () => void sendBoothHeartbeat(config.booth.id, boothStatusForStage(stage));
    send();
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [config, stage]);

  const startOver = () => {
    reset();
    loadConfig(initialConfig);
    setStage("welcome");
  };

  if (!config) return null;

  return (
    <div data-kiosk-mode={config.booth.kioskModeOn} className="flex min-h-dvh flex-col">
      {error && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {stage === "welcome" && <WelcomeStage />}
      {stage === "guest-form" && <GuestFormStage />}
      {stage === "camera" && <CameraStage />}
      {stage === "editing" && <EditorStage />}
      {stage === "finalizing" && <FinalizeStage />}
      {stage === "result" && <ResultStage onStartOver={startOver} />}
    </div>
  );
}
