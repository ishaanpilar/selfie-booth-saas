import { NextResponse } from "next/server";
import { prisma } from "@selfie-booth/database";

/**
 * Public, unauthenticated booth bootstrap endpoint — a kiosk only knows its
 * own `boothId` (an unguessable cuid provisioned by an admin), not a user
 * session. Returns only what a guest-facing kiosk needs to render: no
 * organization secrets, no other booths' data. Production hardening would
 * add a device-scoped bearer token (same pairing pattern as the print
 * agent) so a leaked boothId alone can't be used to spoof heartbeats.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ boothId: string }> }) {
  const { boothId } = await params;

  const booth = await prisma.booth.findUnique({
    where: { id: boothId },
    include: {
      organization: { select: { id: true, name: true, logo: true } },
      eventLinks: {
        include: {
          event: {
            include: {
              templates: { include: { template: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booth) {
    return NextResponse.json({ error: "Booth not found." }, { status: 404 });
  }

  const liveEvent = booth.eventLinks.find((link) => link.event.status === "LIVE")?.event ?? booth.eventLinks[0]?.event ?? null;

  if (!liveEvent) {
    return NextResponse.json({ error: "This booth is not assigned to any event yet." }, { status: 409 });
  }

  return NextResponse.json({
    booth: {
      id: booth.id,
      name: booth.name,
      status: booth.status,
      kioskModeOn: booth.kioskModeOn,
      settings: booth.settings,
    },
    organization: booth.organization,
    event: {
      id: liveEvent.id,
      name: liveEvent.name,
      status: liveEvent.status,
      settings: liveEvent.settings,
      templates: liveEvent.templates.map((link) => ({ ...link.template, isDefault: link.isDefault })),
    },
  });
}
