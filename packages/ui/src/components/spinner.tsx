import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn("h-5 w-5 animate-spin text-slate-400", className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
