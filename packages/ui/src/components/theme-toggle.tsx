"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../theme/theme-provider";
import { cn } from "../lib/cn";

const OPTIONS = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "system" as const, icon: Monitor, label: "System" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            theme === value ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
