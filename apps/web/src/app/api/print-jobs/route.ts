import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type PrintJobStatus } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";

const PRINT_JOB_STATUSES: PrintJobStatus[] = ["QUEUED", "PRINTING", "COMPLETED", "FAILED", "CANCELLED", "RETRYING"];

const CreatePrintJobSchema = z.object({
  id: z.string().min(1), // client-generated, see booth-api.ts
  boothId: z.string().min(1),
  filmStripId: z.string().min(1),
  sessionId: z.string().min(1),
  copies: z.number().int().min(1).max(20).default(1),
});

/** Called by the booth kiosk (no user session — booth-scoped) to enqueue a
 * print job server-side, mirroring what the client's local `PrintQueue`
 * (packages/core) already queued in IndexedDB. The DB row is the durable,
 * admin-visible record; the client queue is what actually drives the
 * printer and retries. */
export async function POST(request: Request) {
  const parsed = CreatePrintJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booth = await prisma.booth.findUnique({ where: { id: parsed.data.boothId } });
  if (!booth) {
    return NextResponse.json({ error: "Booth not found." }, { status: 404 });
  }

  const printJob = await prisma.printJob.upsert({
    where: { id: parsed.data.id },
    update: {},
    create: {
      id: parsed.data.id,
      boothId: parsed.data.boothId,
      filmStripId: parsed.data.filmStripId,
      sessionId: parsed.data.sessionId,
      copies: parsed.data.copies,
    },
  });

  await prisma.analyticsEvent.create({
    data: { organizationId: booth.organizationId, boothId: booth.id, type: "PRINT_QUEUED", metadata: { printJobId: printJob.id } },
  });

  return NextResponse.json({ jobId: printJob.id }, { status: 201 });
}

/** Admin-facing list, scoped to the caller's active organization. */
export async function GET(request: Request) {
  const { organizationId } = await requireActiveOrg();
  const url = new URL(request.url);
  const boothId = url.searchParams.get("boothId") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status = statusParam && PRINT_JOB_STATUSES.includes(statusParam as PrintJobStatus) ? (statusParam as PrintJobStatus) : undefined;

  const jobs = await prisma.printJob.findMany({
    where: {
      booth: { organizationId },
      ...(boothId ? { boothId } : {}),
      ...(status ? { status } : {}),
    },
    include: { booth: { select: { name: true } }, filmStrip: { include: { asset: true } } },
    orderBy: { queuedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ jobs });
}
