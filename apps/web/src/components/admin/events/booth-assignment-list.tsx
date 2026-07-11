"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { useToast } from "@selfie-booth/ui";
import { assignBoothToEvent } from "@/lib/admin/actions";

export function BoothAssignmentList({
  eventId,
  allBooths,
  assignedBoothIds,
}: {
  eventId: string;
  allBooths: Array<{ id: string; name: string; status: string }>;
  assignedBoothIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();
  const assignedSet = new Set(assignedBoothIds);

  if (allBooths.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No booths in your organization yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {allBooths.map((booth) => {
        const assigned = assignedSet.has(booth.id);
        return (
          <li key={booth.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium">{booth.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{booth.status}</p>
            </div>
            <button
              disabled={assigned || pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await assignBoothToEvent(eventId, booth.id);
                  if (!result.ok) push({ tone: "error", title: "Couldn't assign booth", description: result.error });
                })
              }
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                assigned
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "border border-slate-300 text-slate-600 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-300"
              }`}
            >
              {assigned && <Check className="h-3.5 w-3.5" />}
              {assigned ? "Assigned" : "Assign"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
