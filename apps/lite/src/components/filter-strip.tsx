"use client";

import { FILTER_PRESETS } from "@selfie-booth/core/editing";
import { cn } from "@selfie-booth/ui";

export function FilterStrip({ value, onChange }: { value: string; onChange: (filterId: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Photo filter">
      {FILTER_PRESETS.map((preset) => (
        <button
          key={preset.id}
          role="radio"
          aria-checked={value === preset.id}
          onClick={() => onChange(preset.id)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === preset.id
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
