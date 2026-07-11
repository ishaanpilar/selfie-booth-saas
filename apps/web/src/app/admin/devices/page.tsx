import { MonitorSmartphone } from "lucide-react";
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export default async function DevicesPage() {
  const { organizationId } = await requireActiveOrg();
  const devices = await prisma.device.findMany({
    where: { organizationId },
    include: { booth: { select: { name: true } } },
    orderBy: { lastHeartbeat: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Devices</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Kiosks, tablets, and print agents registered to your organization.</p>
      </div>

      {devices.length === 0 ? (
        <EmptyState
          icon={MonitorSmartphone}
          title="No devices registered"
          description="Devices register themselves automatically the first time a booth kiosk or print agent connects."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Booth</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>App version</TableHeaderCell>
              <TableHeaderCell>Pending sync</TableHeaderCell>
              <TableHeaderCell>Last heartbeat</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => {
              const isReallyOnline = device.isOnline && device.lastHeartbeat && Date.now() - device.lastHeartbeat.getTime() < ONLINE_THRESHOLD_MS;
              return (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>{device.type.replace("_", " ")}</TableCell>
                  <TableCell>{device.booth?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={isReallyOnline ? "success" : "neutral"}>{isReallyOnline ? "Online" : "Offline"}</Badge>
                  </TableCell>
                  <TableCell>{device.appVersion ?? "—"}</TableCell>
                  <TableCell>{device.pendingSyncCount > 0 ? <Badge tone="warning">{device.pendingSyncCount} pending</Badge> : "0"}</TableCell>
                  <TableCell>{device.lastHeartbeat ? device.lastHeartbeat.toLocaleString() : "Never"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
