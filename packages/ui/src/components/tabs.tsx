"use client";

import { createContext, useContext, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  idBase: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const idBase = useId();
  const value = controlledValue ?? uncontrolled;
  const setValue = (next: string) => {
    if (controlledValue === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ value, setValue, idBase }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const triggers = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const currentIndex = triggers.findIndex((t) => t === document.activeElement);
    if (currentIndex === -1) return;
    const nextIndex = e.key === "ArrowRight" ? (currentIndex + 1) % triggers.length : (currentIndex - 1 + triggers.length) % triggers.length;
    triggers[nextIndex]?.focus();
    triggers[nextIndex]?.click();
  };

  return (
    <div role="tablist" onKeyDown={handleKeyDown} className={cn("inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const active = ctx.value === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      id={`${ctx.idBase}-trigger-${value}`}
      aria-controls={`${ctx.idBase}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;

  return (
    <div role="tabpanel" id={`${ctx.idBase}-panel-${value}`} aria-labelledby={`${ctx.idBase}-trigger-${value}`} className={cn("mt-4", className)}>
      {children}
    </div>
  );
}
