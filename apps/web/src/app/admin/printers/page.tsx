import { Printer as PrinterIcon } from "lucide-react";
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { NewPrinterButton } from "@/components/admin/printers/new-printer-button";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  UNKNOWN: "neutral",
  READY: "success",
  OFFLINE: "neutral",
  ERROR: "danger",
  OUT_OF_PAPER: "warning",
  OUT_OF_INK: "warning",
  BUSY: "info",
};

export default async function PrintersPage() {
  const { organizationId } = await requireActiveOrg();
  const [printers, booths] = await Promise.all([
    prisma.printer.findMany({ where: { organizationId }, include: { booth: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.booth.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Printers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Physical printers bound to your booths.</p>
        </div>
        <NewPrinterButton booths={booths} />
      </div>

      {printers.length === 0 ? (
        <EmptyState icon={PrinterIcon} title="No printers yet" description="Add a printer and bind it to a booth to enable in-app printing." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Booth</TableHeaderCell>
              <TableHeaderCell>Connection</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Last seen</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {printers.map((printer) => (
              <TableRow key={printer.id}>
                <TableCell className="font-medium">{printer.name}</TableCell>
                <TableCell>{printer.booth?.name ?? "Unassigned"}</TableCell>
                <TableCell>{printer.connectionType.replace("_", " ")}</TableCell>
                <TableCell>
                  <Badge tone={STATUS_TONE[printer.status]}>{printer.status.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell>{printer.lastSeenAt ? printer.lastSeenAt.toLocaleString() : "Never"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
