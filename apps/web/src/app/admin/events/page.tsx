import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { NewEventButton } from "@/components/admin/events/new-event-button";
import { EVENT_STATUS_TONE } from "@/lib/admin/status-tones";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const { organizationId } = await requireActiveOrg();
  const events = await prisma.event.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { boothLinks: true, sessions: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your organization's events.</p>
        </div>
        <NewEventButton />
      </div>

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" description="Create your first event to start assigning booths and templates." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Booths</TableHeaderCell>
              <TableHeaderCell>Sessions</TableHeaderCell>
              <TableHeaderCell>Starts</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Link href={`/admin/events/${event.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                    {event.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge tone={EVENT_STATUS_TONE[event.status]}>{event.status}</Badge>
                </TableCell>
                <TableCell>{event._count.boothLinks}</TableCell>
                <TableCell>{event._count.sessions}</TableCell>
                <TableCell>{event.startsAt ? event.startsAt.toLocaleDateString() : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
