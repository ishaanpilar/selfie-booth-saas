import { ArrowUpRight, Sparkles } from "lucide-react";

const FULL_APP_URL = process.env.NEXT_PUBLIC_FULL_APP_URL ?? "https://selfiebooth.app";

export function UpsellBanner() {
  return (
    <a
      href={FULL_APP_URL}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
    >
      <Sparkles className="h-4 w-4" />
      Running an event? Get multi-booth events, real printers &amp; an admin dashboard
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
