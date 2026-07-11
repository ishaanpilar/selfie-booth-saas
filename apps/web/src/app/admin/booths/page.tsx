import Link from "next/link";
import { Camera } from "lucide-react";
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { NewBoothButton } from "@/components/admin/booths/new-booth-button";
import { BOOTH_STATUS_TONE } from "@/lib/admin/status-tones";

export const dynamic = "force-dynamic";

export default async function BoothsPage() {
  const { organizationId } = await requireActiveOrg();
  const booths = await prisma.booth.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { eventLinks: { include: { event: { select: { name: true } } }, take: 1, orderBy: { createdAt: "desc" } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Booths</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kiosks running the guest-facing capture flow.</p>
        </div>
        <NewBoothButton />
      </div>

      {booths.length === 0 ? (
        <EmptyState icon={Camera} title="No booths yet" description="Create a booth, then open its kiosk link on the device that will run it." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Event</TableHeaderCell>
              <TableHeaderCell>Last heartbeat</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {booths.map((booth) => (
              <TableRow key={booth.id}>
                <TableCell>
                  <Link href={`/admin/booths/${booth.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                    {booth.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge tone={BOOTH_STATUS_TONE[booth.status]}>{booth.status}</Badge>
                </TableCell>
                <TableCell>{booth.eventLinks[0]?.event.name ?? "—"}</TableCell>
                <TableCell>{booth.lastHeartbeat ? booth.lastHeartbeat.toLocaleTimeString() : "Never"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
