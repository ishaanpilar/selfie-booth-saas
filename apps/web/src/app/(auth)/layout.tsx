import type { ReactNode } from "react";
import { Camera } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Camera className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Selfie Booth</span>
        </div>
        {children}
      </div>
    </main>
  );
}
