"use client";

import { useTransition } from "react";
import { useToast } from "@selfie-booth/ui";
import { setBoothKioskMode } from "@/lib/admin/actions";

export function KioskModeToggle({ boothId, initialValue }: { boothId: string; initialValue: boolean }) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        defaultChecked={initialValue}
        disabled={pending}
        onChange={(e) => {
          const checked = e.target.checked;
          startTransition(async () => {
            const result = await setBoothKioskMode(boothId, checked);
            if (!result.ok) push({ tone: "error", title: "Couldn't update kiosk mode", description: result.error });
          });
        }}
        className="h-4 w-4 rounded accent-indigo-600"
      />
      <span className="text-sm">
        Kiosk mode
        <span className="block text-xs text-slate-500 dark:text-slate-400">Locks text selection and long-press menus on the booth screen.</span>
      </span>
    </label>
  );
}
