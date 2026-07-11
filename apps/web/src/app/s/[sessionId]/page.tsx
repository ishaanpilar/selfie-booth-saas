import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Download, Camera } from "lucide-react";
import { prisma } from "@selfie-booth/database";

export const metadata: Metadata = { title: "Your photo" };

/** Public, unauthenticated — this is the page a guest lands on after
 * scanning the QR code on their printed strip or receiving a share link.
 * No session/org context required; the sessionId itself (an unguessable
 * cuid) is the access control. */
export default async function ShareSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const session = await prisma.photoSession.findUnique({
    where: { id: sessionId },
    include: {
      event: { select: { name: true } },
      filmStrips: { include: { asset: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const filmStrip = session?.filmStrips[0];
  if (!session || !filmStrip) {
    notFound();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Camera className="h-4 w-4" />
        {session.event.name}
      </div>

      <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={filmStrip.asset.url} alt="Your photo" className="w-full" />
      </div>

      <a
        href={filmStrip.asset.url}
        download
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        <Download className="h-4 w-4" />
        Download
      </a>
    </main>
  );
}
