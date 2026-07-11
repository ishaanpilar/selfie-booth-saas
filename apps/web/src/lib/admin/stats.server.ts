import "server-only";
import { prisma } from "@selfie-booth/database";

export interface OverviewStats {
  eventCount: number;
  liveEventCount: number;
  boothCount: number;
  onlineBoothCount: number;
  photoCount30d: number;
  printCount30d: number;
  sessionCount30d: number;
  hourlyUsage: Array<{ hour: number; sessions: number }>;
  recentActivity: Array<{ id: string; type: string; occurredAt: Date; boothName: string | null; eventName: string | null }>;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export async function getOverviewStats(organizationId: string): Promise<OverviewStats> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_MS);

  const [eventCount, liveEventCount, boothCount, onlineBoothCount, photoCount30d, printCount30d, sessionEvents, recentActivity] = await Promise.all([
    prisma.event.count({ where: { organizationId } }),
    prisma.event.count({ where: { organizationId, status: "LIVE" } }),
    prisma.booth.count({ where: { organizationId } }),
    prisma.booth.count({ where: { organizationId, lastHeartbeat: { gte: onlineSince } } }),
    prisma.analyticsEvent.count({ where: { organizationId, type: "PHOTO_CAPTURED", occurredAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { organizationId, type: "PRINT_COMPLETED", occurredAt: { gte: since } } }),
    prisma.analyticsEvent.findMany({
      where: { organizationId, type: "SESSION_STARTED", occurredAt: { gte: since } },
      select: { occurredAt: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: 15,
      include: { booth: { select: { name: true } }, event: { select: { name: true } } },
    }),
  ]);

  const hourlyBuckets = new Array(24).fill(0);
  for (const { occurredAt } of sessionEvents) {
    hourlyBuckets[occurredAt.getHours()]!++;
  }

  return {
    eventCount,
    liveEventCount,
    boothCount,
    onlineBoothCount,
    photoCount30d,
    printCount30d,
    sessionCount30d: sessionEvents.length,
    hourlyUsage: hourlyBuckets.map((sessions, hour) => ({ hour, sessions })),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      type: a.type,
      occurredAt: a.occurredAt,
      boothName: a.booth?.name ?? null,
      eventName: a.event?.name ?? null,
    })),
  };
}
