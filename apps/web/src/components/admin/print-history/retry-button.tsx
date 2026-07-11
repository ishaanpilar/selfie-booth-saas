"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { useToast } from "@selfie-booth/ui";
import { retryPrintJob } from "@/lib/admin/actions";

export function RetryButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryPrintJob(jobId);
          if (!result.ok) push({ tone: "error", title: "Couldn't retry", description: result.error });
          else push({ tone: "success", title: "Print job re-queued" });
        })
      }
      className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Retry
    </button>
  );
}
