import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { getBoothConfig } from "@/lib/booth/get-booth-config.server";
import { BoothExperience } from "@/components/booth/booth-experience";

export const metadata: Metadata = { title: "Booth" };
export const dynamic = "force-dynamic";

export default async function BoothPage({ params }: { params: Promise<{ boothId: string }> }) {
  const { boothId } = await params;
  const result = await getBoothConfig(boothId);

  if (!result.ok && result.status === 404) {
    notFound();
  }

  if (!result.ok) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{result.error}</p>
      </main>
    );
  }

  return <BoothExperience initialConfig={result.config} />;
}
