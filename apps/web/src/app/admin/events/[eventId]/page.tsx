import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { EventStatusSelect } from "@/components/admin/events/event-status-select";
import { BoothAssignmentList } from "@/components/admin/events/booth-assignment-list";
import { TemplateAssignmentList } from "@/components/admin/events/template-assignment-list";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { organizationId } = await requireActiveOrg();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId },
    include: { boothLinks: { include: { booth: true } }, templates: true },
  });
  if (!event) notFound();

  const [allBooths, allTemplates] = await Promise.all([
    prisma.booth.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    prisma.template.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{event.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">/{event.slug}</p>
        </div>
        <EventStatusSelect eventId={event.id} status={event.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booths</CardTitle>
          </CardHeader>
          <CardContent>
            <BoothAssignmentList eventId={event.id} allBooths={allBooths} assignedBoothIds={event.boothLinks.map((l) => l.boothId)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateAssignmentList
              eventId={event.id}
              allTemplates={allTemplates}
              assigned={event.templates.map((t) => ({ templateId: t.templateId, isDefault: t.isDefault }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
