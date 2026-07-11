"use client";

import { useTransition } from "react";
import { useToast } from "@selfie-booth/ui";
import { updateEventStatus } from "@/lib/admin/actions";

const STATUSES = ["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "ARCHIVED", "CANCELLED"] as const;

export function EventStatusSelect({ eventId, status }: { eventId: string; status: (typeof STATUSES)[number] }) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as (typeof STATUSES)[number];
        startTransition(async () => {
          const result = await updateEventStatus(eventId, next);
          if (!result.ok) {
            push({ tone: "error", title: "Couldn't update status", description: result.error });
          }
        });
      }}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
