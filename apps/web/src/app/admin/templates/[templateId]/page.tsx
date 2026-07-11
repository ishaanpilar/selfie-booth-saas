import { notFound } from "next/navigation";
import type { TemplateDesign } from "@selfie-booth/core/types";
import { prisma } from "@selfie-booth/database";
import { requireActiveOrg } from "@/lib/auth-server";
import { TemplateEditor } from "@/components/admin/templates/template-editor";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  const { organizationId } = await requireActiveOrg();

  const template = await prisma.template.findFirst({ where: { id: templateId, organizationId } });
  if (!template) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{template.name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {template.widthMm}mm × {template.heightMm}mm · {template.dpi} DPI
        </p>
      </div>

      <TemplateEditor templateId={template.id} widthMm={template.widthMm} heightMm={template.heightMm} initialDesign={template.design as unknown as TemplateDesign} />
    </div>
  );
}
