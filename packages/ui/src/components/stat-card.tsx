import type { ComponentType } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./card";
import { cn } from "../lib/cn";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  /** Percent change vs. the previous period; positive renders green. */
  trend?: number;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      {trend !== undefined && (
        <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
          {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% vs. last period
        </p>
      )}
    </Card>
  );
}
