import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { Badge, Card, EmptyState } from "@selfie-booth/ui";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { NewTemplateButton } from "@/components/admin/templates/new-template-button";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const { organizationId } = await requireActiveOrg();
  const templates = await prisma.template.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Film strip and print layouts.</p>
        </div>
        <NewTemplateButton />
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="No templates yet" description="Create a template to start designing your film strip layout." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((template) => (
            <Link key={template.id} href={`/admin/templates/${template.id}`}>
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div
                  className="mx-auto mb-3 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  style={{ aspectRatio: `${template.widthMm} / ${template.heightMm}`, maxHeight: 140 }}
                />
                <p className="truncate text-sm font-medium">{template.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge tone="neutral">{template.layoutType.replace("_", " ")}</Badge>
                  {template.isDefault && <Badge tone="info">Default</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
