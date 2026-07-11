import { CalendarDays, Camera, ImageIcon, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@selfie-booth/ui";
import { requireActiveOrg } from "@/lib/auth-server";
import { getOverviewStats } from "@/lib/admin/stats.server";
import { HourlyUsageChart } from "@/components/admin/hourly-usage-chart";
import { ACTIVITY_LABEL } from "@/lib/admin/activity-labels";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const { organizationId } = await requireActiveOrg();
  const stats = await getOverviewStats(organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Last 30 days across your organization.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Photos captured" value={stats.photoCount30d} icon={ImageIcon} />
        <StatCard label="Prints completed" value={stats.printCount30d} icon={Printer} />
        <StatCard label="Sessions" value={stats.sessionCount30d} icon={CalendarDays} />
        <StatCard label="Booths online" value={`${stats.onlineBoothCount} / ${stats.boothCount}`} icon={Camera} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Peak usage by hour</CardTitle>
          </CardHeader>
          <CardContent>
            <HourlyUsageChart data={stats.hourlyUsage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[280px] space-y-3 overflow-y-auto">
            {stats.recentActivity.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>}
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{ACTIVITY_LABEL[activity.type] ?? activity.type}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{activity.boothName ?? activity.eventName ?? "—"}</p>
                </div>
                <time className="shrink-0 text-xs text-slate-400" dateTime={activity.occurredAt.toISOString()}>
                  {formatRelativeTime(activity.occurredAt)}
                </time>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}
