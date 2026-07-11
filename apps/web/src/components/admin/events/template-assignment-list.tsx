"use client";

import { useTransition } from "react";
import { Star, Check } from "lucide-react";
import { useToast } from "@selfie-booth/ui";
import { assignTemplateToEvent } from "@/lib/admin/actions";

export function TemplateAssignmentList({
  eventId,
  allTemplates,
  assigned,
}: {
  eventId: string;
  allTemplates: Array<{ id: string; name: string; layoutType: string }>;
  assigned: Array<{ templateId: string; isDefault: boolean }>;
}) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();
  const assignedMap = new Map(assigned.map((a) => [a.templateId, a.isDefault]));

  if (allTemplates.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No templates in your organization yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {allTemplates.map((template) => {
        const isAssigned = assignedMap.has(template.id);
        const isDefault = assignedMap.get(template.id) ?? false;
        return (
          <li key={template.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium">{template.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{template.layoutType.replace("_", " ")}</p>
            </div>
            <div className="flex items-center gap-2">
              {isAssigned && (
                <button
                  disabled={isDefault || pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await assignTemplateToEvent(eventId, template.id, true);
                      if (!result.ok) push({ tone: "error", title: "Couldn't set default", description: result.error });
                    })
                  }
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    isDefault ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : "border border-slate-300 text-slate-500 dark:border-slate-600"
                  }`}
                >
                  <Star className="h-3.5 w-3.5" />
                  {isDefault ? "Default" : "Set default"}
                </button>
              )}
              <button
                disabled={isAssigned || pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await assignTemplateToEvent(eventId, template.id, !isAssigned && assigned.length === 0);
                    if (!result.ok) push({ tone: "error", title: "Couldn't assign template", description: result.error });
                  })
                }
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isAssigned
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "border border-slate-300 text-slate-600 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-300"
                }`}
              >
                {isAssigned && <Check className="h-3.5 w-3.5" />}
                {isAssigned ? "Assigned" : "Assign"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
