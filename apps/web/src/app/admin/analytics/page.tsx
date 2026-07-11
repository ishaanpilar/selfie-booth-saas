import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, StatCard, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { organizationId } = await requireActiveOrg();

  const [events, printTotals] = await Promise.all([
    prisma.event.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { sessions: true } } },
    }),
    prisma.printJob.groupBy({
      by: ["status"],
      where: { booth: { organizationId } },
      _count: { _all: true },
    }),
  ]);

  const eventStats = await Promise.all(
    events.map(async (event) => {
      const [photoCount, filmStripCount] = await Promise.all([
        prisma.analyticsEvent.count({ where: { eventId: event.id, type: "PHOTO_CAPTURED" } }),
        prisma.analyticsEvent.count({ where: { eventId: event.id, type: "FILM_STRIP_GENERATED" } }),
      ]);
      return { ...event, photoCount, filmStripCount };
    }),
  );

  const totalPrints = printTotals.reduce((sum, t) => sum + t._count._all, 0);
  const completedPrints = printTotals.find((t) => t.status === "COMPLETED")?._count._all ?? 0;
  const successRate = totalPrints > 0 ? (completedPrints / totalPrints) * 100 : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Per-event breakdown and print reliability.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total print jobs" value={totalPrints} />
        <StatCard label="Print success rate" value={successRate === null ? "—" : `${successRate.toFixed(0)}%`} />
        <StatCard label="Events tracked" value={events.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By event</CardTitle>
        </CardHeader>
        <CardContent>
          {eventStats.length === 0 ? (
            <EmptyState icon={BarChart3} title="No event data yet" />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Event</TableHeaderCell>
                  <TableHeaderCell>Sessions</TableHeaderCell>
                  <TableHeaderCell>Photos</TableHeaderCell>
                  <TableHeaderCell>Film strips</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventStats.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{event._count.sessions}</TableCell>
                    <TableCell>{event.photoCount}</TableCell>
                    <TableCell>{event.filmStripCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
