import "server-only";
import { prisma } from "@selfie-booth/database";
import type { TemplateDesign } from "@selfie-booth/core/types";
import type { BoothConfig } from "./booth-store";

export type BoothConfigResult = { ok: true; config: BoothConfig } | { ok: false; status: 404 | 409; error: string };

/**
 * Single source of truth for "what does this booth need to render its
 * guest-facing flow" — used by both the public config API route (so a
 * kiosk can re-fetch after a reconnect without a full page reload) and the
 * `/booth/[boothId]` server component (so the first paint has no
 * client-side round trip). Keeping one implementation means the API and
 * the SSR'd page can never drift on what "the booth's config" means.
 */
export async function getBoothConfig(boothId: string): Promise<BoothConfigResult> {
  const booth = await prisma.booth.findUnique({
    where: { id: boothId },
    include: {
      organization: { select: { id: true, name: true, logo: true } },
      eventLinks: {
        include: { event: { include: { templates: { include: { template: true } } } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booth) {
    return { ok: false, status: 404, error: "Booth not found." };
  }

  const liveEvent = booth.eventLinks.find((link) => link.event.status === "LIVE")?.event ?? booth.eventLinks[0]?.event ?? null;

  if (!liveEvent) {
    return { ok: false, status: 409, error: "This booth is not assigned to any event yet." };
  }

  const config: BoothConfig = {
    booth: {
      id: booth.id,
      name: booth.name,
      kioskModeOn: booth.kioskModeOn,
      settings: booth.settings as BoothConfig["booth"]["settings"],
    },
    organization: booth.organization,
    event: {
      id: liveEvent.id,
      name: liveEvent.name,
      settings: liveEvent.settings as BoothConfig["event"]["settings"],
      templates: liveEvent.templates.map((link) => ({
        id: link.template.id,
        name: link.template.name,
        layoutType: link.template.layoutType,
        widthMm: link.template.widthMm,
        heightMm: link.template.heightMm,
        dpi: link.template.dpi,
        design: link.template.design as unknown as TemplateDesign,
        isDefault: link.isDefault,
      })),
    },
  };

  return { ok: true, config };
}
