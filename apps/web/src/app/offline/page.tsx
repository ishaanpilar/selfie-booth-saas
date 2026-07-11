import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="h-12 w-12 text-slate-400" aria-hidden />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        This booth keeps capturing and printing while offline — photos and print jobs queue locally and sync
        automatically once the connection returns.
      </p>
    </main>
  );
}
