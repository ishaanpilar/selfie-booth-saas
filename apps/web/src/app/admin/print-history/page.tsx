import { History } from "lucide-react";
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { PRINT_JOB_STATUS_TONE } from "@/lib/admin/status-tones";
import { RetryButton } from "@/components/admin/print-history/retry-button";

export const dynamic = "force-dynamic";

export default async function PrintHistoryPage() {
  const { organizationId } = await requireActiveOrg();
  const jobs = await prisma.printJob.findMany({
    where: { booth: { organizationId } },
    include: { booth: { select: { name: true } } },
    orderBy: { queuedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Print history</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Most recent 100 print jobs across your booths.</p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon={History} title="No print jobs yet" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Booth</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Copies</TableHeaderCell>
              <TableHeaderCell>Attempts</TableHeaderCell>
              <TableHeaderCell>Queued</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>{job.booth.name}</TableCell>
                <TableCell>
                  <Badge tone={PRINT_JOB_STATUS_TONE[job.status]}>{job.status}</Badge>
                  {job.lastError && <p className="mt-0.5 max-w-[220px] truncate text-xs text-red-500">{job.lastError}</p>}
                </TableCell>
                <TableCell>{job.copies}</TableCell>
                <TableCell>
                  {job.attempts} / {job.maxAttempts}
                </TableCell>
                <TableCell>{job.queuedAt.toLocaleString()}</TableCell>
                <TableCell>{job.status === "FAILED" && <RetryButton jobId={job.id} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
