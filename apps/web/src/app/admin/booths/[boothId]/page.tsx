import { notFound } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { BOOTH_STATUS_TONE } from "@/lib/admin/status-tones";
import { BoothKioskQr } from "@/components/admin/booths/booth-kiosk-qr";
import { KioskModeToggle } from "@/components/admin/booths/kiosk-mode-toggle";

export const dynamic = "force-dynamic";

export default async function BoothDetailPage({ params }: { params: Promise<{ boothId: string }> }) {
  const { boothId } = await params;
  const { organizationId } = await requireActiveOrg();

  const booth = await prisma.booth.findFirst({
    where: { id: boothId, organizationId },
    include: {
      eventLinks: { include: { event: { select: { name: true, status: true } } } },
      printers: true,
      device: true,
    },
  });
  if (!booth) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{booth.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {booth.lastHeartbeat ? `Last seen ${booth.lastHeartbeat.toLocaleString()}` : "Never connected"}
          </p>
        </div>
        <Badge tone={BOOTH_STATUS_TONE[booth.status]}>{booth.status}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kiosk link</CardTitle>
          </CardHeader>
          <CardContent>
            <BoothKioskQr boothId={booth.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <KioskModeToggle boothId={booth.id} initialValue={booth.kioskModeOn} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned events</CardTitle>
          </CardHeader>
          <CardContent>
            {booth.eventLinks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Not assigned to an event yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {booth.eventLinks.map((link) => (
                  <li key={link.id} className="flex items-center justify-between">
                    {link.event.name}
                    <Badge tone="neutral">{link.event.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Printers</CardTitle>
          </CardHeader>
          <CardContent>
            {booth.printers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No printer bound. Add one from the Printers page.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {booth.printers.map((printer) => (
                  <li key={printer.id} className="flex items-center justify-between">
                    {printer.name}
                    <Badge tone="neutral">{printer.connectionType}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
