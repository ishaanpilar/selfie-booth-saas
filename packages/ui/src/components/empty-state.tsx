import type { ComponentType, ReactNode } from "react";
import { cn } from "../lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700", className)}>
      {Icon && <Icon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />}
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
