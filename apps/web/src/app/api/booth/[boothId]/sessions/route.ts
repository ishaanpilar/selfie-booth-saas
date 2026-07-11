import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, Prisma } from "@selfie-booth/database";

const CreateSessionSchema = z.object({
  eventId: z.string().min(1),
  guestName: z.string().max(200).optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().max(40).optional(),
  consent: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ boothId: string }> }) {
  const { boothId } = await params;
  const parsed = CreateSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const link = await prisma.eventBooth.findUnique({
    where: { eventId_boothId: { eventId: parsed.data.eventId, boothId } },
  });
  if (!link) {
    return NextResponse.json({ error: "This booth is not assigned to that event." }, { status: 403 });
  }

  const session = await prisma.photoSession.create({
    data: {
      eventId: parsed.data.eventId,
      boothId,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      guestPhone: parsed.data.guestPhone,
      consent: parsed.data.consent as Prisma.InputJsonValue | undefined,
    },
  });

  const booth = await prisma.booth.findUniqueOrThrow({ where: { id: boothId } });
  await prisma.analyticsEvent.create({
    data: { organizationId: booth.organizationId, eventId: parsed.data.eventId, boothId, type: "SESSION_STARTED" },
  });

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}
