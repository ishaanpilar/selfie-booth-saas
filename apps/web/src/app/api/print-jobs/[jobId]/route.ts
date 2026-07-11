import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@selfie-booth/database";

const UpdatePrintJobSchema = z.object({
  status: z.enum(["PRINTING", "COMPLETED", "FAILED", "CANCELLED", "RETRYING"]),
  attempts: z.number().int().min(0).optional(),
  lastError: z.string().optional(),
});

/** Reports the outcome of a client-driven print attempt (packages/core's
 * `PrintQueue` owns retries and calls this once per attempt) so the DB row
 * — what the admin dashboard's print-history view reads — stays truthful. */
export async function PATCH(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const parsed = UpdatePrintJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const job = await prisma.printJob.findUnique({ where: { id: jobId }, include: { booth: true } });
  if (!job) {
    return NextResponse.json({ error: "Print job not found." }, { status: 404 });
  }

  const now = new Date();
  const updated = await prisma.printJob.update({
    where: { id: jobId },
    data: {
      status: parsed.data.status,
      attempts: parsed.data.attempts ?? job.attempts,
      lastError: parsed.data.lastError,
      startedAt: parsed.data.status === "PRINTING" && !job.startedAt ? now : undefined,
      completedAt: parsed.data.status === "COMPLETED" || parsed.data.status === "FAILED" ? now : undefined,
    },
  });

  if (parsed.data.status === "COMPLETED" || parsed.data.status === "FAILED") {
    await prisma.analyticsEvent.create({
      data: {
        organizationId: job.booth.organizationId,
        boothId: job.boothId,
        type: parsed.data.status === "COMPLETED" ? "PRINT_COMPLETED" : "PRINT_FAILED",
        metadata: { printJobId: jobId, error: parsed.data.lastError ?? null },
      },
    });
  }

  return NextResponse.json({ job: updated });
}
