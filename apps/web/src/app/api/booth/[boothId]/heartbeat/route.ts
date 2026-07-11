import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@selfie-booth/database";

const HeartbeatSchema = z.object({
  status: z.enum(["OFFLINE", "ONLINE", "IDLE", "CAPTURING", "PRINTING", "ERROR", "MAINTENANCE"]),
  appVersion: z.string().optional(),
  pendingSyncCount: z.number().int().min(0).optional(),
});

/**
 * Polled by the booth app roughly once a minute (see src/lib/booth/use-heartbeat.ts)
 * so the admin dashboard's device-health panel reflects reality within a
 * short window, and so a booth that goes dark (no heartbeat for N minutes)
 * can be flagged OFFLINE even if it never got to send that status itself.
 */
export async function POST(request: Request, { params }: { params: Promise<{ boothId: string }> }) {
  const { boothId } = await params;
  const parsed = HeartbeatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booth = await prisma.booth.update({
    where: { id: boothId },
    data: { status: parsed.data.status, lastHeartbeat: new Date() },
  }).catch(() => null);

  if (!booth) {
    return NextResponse.json({ error: "Booth not found." }, { status: 404 });
  }

  await prisma.device.updateMany({
    where: { boothId },
    data: {
      isOnline: true,
      lastHeartbeat: new Date(),
      appVersion: parsed.data.appVersion,
      pendingSyncCount: parsed.data.pendingSyncCount ?? undefined,
    },
  });

  if (parsed.data.status === "ONLINE" || parsed.data.status === "IDLE") {
    await prisma.analyticsEvent.create({
      data: { organizationId: booth.organizationId, boothId, type: "BOOTH_ONLINE" },
    });
  }

  return NextResponse.json({ ok: true });
}
