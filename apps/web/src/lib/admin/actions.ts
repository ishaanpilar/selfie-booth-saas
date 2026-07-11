"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma, Prisma, type TemplateLayoutType } from "@selfie-booth/database";
import { PHOTO_COUNT_BY_LAYOUT, type TemplateDesign } from "@selfie-booth/core/types";
import { auth } from "@selfie-booth/auth";
import { requireActiveOrg, assertRoleAtLeast, AuthError } from "@/lib/auth-server";

/** Every action follows the same shape so form components can render a
 * single error string without a switch statement per action. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

function handleActionError(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid input." };
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const CreateEventSchema = z.object({
  name: z.string().min(2).max(120),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  timezone: z.string().default("UTC"),
});

export async function createEvent(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "MANAGER");

    const parsed = CreateEventSchema.parse({
      name: formData.get("name"),
      startsAt: formData.get("startsAt") || undefined,
      endsAt: formData.get("endsAt") || undefined,
      timezone: (formData.get("timezone") as string) || "UTC",
    });

    const slug = slugify(parsed.name);
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: parsed.name,
        slug,
        timezone: parsed.timezone,
        startsAt: parsed.startsAt ? new Date(parsed.startsAt) : undefined,
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : undefined,
        settings: { guestFields: [], shareEnabled: true, printEnabled: true },
      },
    });

    revalidatePath("/admin/events");
    return { ok: true, data: { id: event.id } };
  } catch (err) {
    return handleActionError(err);
  }
}

const EVENT_STATUSES = ["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "ARCHIVED", "CANCELLED"] as const;

export async function updateEventStatus(eventId: string, status: (typeof EVENT_STATUSES)[number]): Promise<ActionResult> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "MANAGER");
    await prisma.event.update({ where: { id: eventId, organizationId }, data: { status } });
    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function assignBoothToEvent(eventId: string, boothId: string): Promise<ActionResult> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "MANAGER");
    const [event, booth] = await Promise.all([
      prisma.event.findFirstOrThrow({ where: { id: eventId, organizationId } }),
      prisma.booth.findFirstOrThrow({ where: { id: boothId, organizationId } }),
    ]);
    await prisma.eventBooth.upsert({
      where: { eventId_boothId: { eventId: event.id, boothId: booth.id } },
      update: {},
      create: { eventId: event.id, boothId: booth.id },
    });
    revalidatePath(`/admin/events/${eventId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function assignTemplateToEvent(eventId: string, templateId: string, isDefault: boolean): Promise<ActionResult> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "MANAGER");
    await prisma.event.findFirstOrThrow({ where: { id: eventId, organizationId } });
    await prisma.template.findFirstOrThrow({ where: { id: templateId, organizationId } });

    if (isDefault) {
      await prisma.eventTemplate.updateMany({ where: { eventId }, data: { isDefault: false } });
    }
    await prisma.eventTemplate.upsert({
      where: { eventId_templateId: { eventId, templateId } },
      update: { isDefault },
      create: { eventId, templateId, isDefault },
    });
    revalidatePath(`/admin/events/${eventId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Booths
// ---------------------------------------------------------------------------

const CreateBoothSchema = z.object({
  name: z.string().min(2).max(120),
  countdownSeconds: z.coerce.number().int().min(1).max(10).default(3),
});

export async function createBooth(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "MANAGER");

    const parsed = CreateBoothSchema.parse({
      name: formData.get("name"),
      countdownSeconds: formData.get("countdownSeconds"),
    });

    const booth = await prisma.booth.create({
      data: {
        organizationId,
        name: parsed.name,
        settings: { cameraSource: "webcam", countdownSeconds: parsed.countdownSeconds, burstCount: 1 },
      },
    });

    revalidatePath("/admin/booths");
    return { ok: true, data: { id: booth.id } };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function setBoothKioskMode(boothId: string, kioskModeOn: boolean): Promise<ActionResult> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "OPERATOR");
    await prisma.booth.update({ where: { id: boothId, organizationId }, data: { kioskModeOn } });
    revalidatePath(`/admin/booths/${boothId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const CreateTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  layoutType: z.enum(["STRIP_2", "STRIP_3", "STRIP_4", "SINGLE"]),
});

/** Generates a sensible default `TemplateDesign` for the standard layouts —
 * the same shape produced by packages/database's seed script — so a new
 * template is immediately renderable without a designer session. The admin
 * template editor (see /admin/templates/[templateId]) lets slots/layers be
 * dragged from there; this is just a reasonable starting point. */
function generateDefaultDesign(layoutType: TemplateLayoutType, widthMm: number, heightMm: number): TemplateDesign {
  const slotCount = PHOTO_COUNT_BY_LAYOUT[layoutType] || 1;
  const margin = 5;
  const slotHeight = (heightMm - margin * 2) / slotCount;

  return {
    version: 1,
    background: "#ffffff",
    bleedMm: 3,
    safeMarginMm: 3,
    slots: Array.from({ length: slotCount }, (_, i) => ({
      id: `photo-${i + 1}`,
      type: "photo" as const,
      xMm: margin,
      yMm: margin + i * slotHeight,
      widthMm: widthMm - margin * 2,
      heightMm: slotHeight - 2,
    })),
    layers: [
      {
        id: "footer-text",
        type: "text" as const,
        text: "{{event.name}}",
        xMm: margin,
        yMm: heightMm - 8,
        widthMm: widthMm - margin * 2,
        heightMm: 6,
        fontSize: 6,
        align: "center" as const,
      },
    ],
  };
}

const LAYOUT_DIMENSIONS: Record<string, { widthMm: number; heightMm: number }> = {
  STRIP_2: { widthMm: 50.8, heightMm: 152.4 },
  STRIP_3: { widthMm: 50.8, heightMm: 152.4 },
  STRIP_4: { widthMm: 50.8, heightMm: 203.2 },
  SINGLE: { widthMm: 101.6, heightMm: 152.4 },
};

export async function createTemplate(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "MANAGER");

    const parsed = CreateTemplateSchema.parse({
      name: formData.get("name"),
      layoutType: formData.get("layoutType"),
    });

    const dims = LAYOUT_DIMENSIONS[parsed.layoutType]!;
    const design = generateDefaultDesign(parsed.layoutType, dims.widthMm, dims.heightMm);

    const template = await prisma.template.create({
      data: {
        organizationId,
        name: parsed.name,
        layoutType: parsed.layoutType,
        widthMm: dims.widthMm,
        heightMm: dims.heightMm,
        dpi: 300,
        design: design as unknown as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/admin/templates");
    return { ok: true, data: { id: template.id } };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateTemplateDesign(templateId: string, design: TemplateDesign): Promise<ActionResult> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "MANAGER");
    await prisma.template.update({
      where: { id: templateId, organizationId },
      data: { design: design as unknown as Prisma.InputJsonValue },
    });
    revalidatePath(`/admin/templates/${templateId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Printers
// ---------------------------------------------------------------------------

const CreatePrinterSchema = z.object({
  name: z.string().min(2).max(120),
  connectionType: z.enum(["WEBUSB", "LOCAL_AGENT", "CLOUD"]),
  boothId: z.string().optional(),
  agentBaseUrl: z.string().url().optional(),
});

export async function createPrinter(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "MANAGER");

    const parsed = CreatePrinterSchema.parse({
      name: formData.get("name"),
      connectionType: formData.get("connectionType"),
      boothId: formData.get("boothId") || undefined,
      agentBaseUrl: formData.get("agentBaseUrl") || undefined,
    });

    const printer = await prisma.printer.create({
      data: {
        organizationId,
        name: parsed.name,
        connectionType: parsed.connectionType,
        boothId: parsed.boothId,
        driverInfo: parsed.agentBaseUrl ? { baseUrl: parsed.agentBaseUrl } : undefined,
      },
    });

    revalidatePath("/admin/printers");
    return { ok: true, data: { id: printer.id } };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Print jobs
// ---------------------------------------------------------------------------

export async function retryPrintJob(jobId: string): Promise<ActionResult> {
  try {
    const { organizationId, role } = await requireActiveOrg();
    assertRoleAtLeast(role, "OPERATOR");
    const job = await prisma.printJob.findFirstOrThrow({ where: { id: jobId, booth: { organizationId } } });
    await prisma.printJob.update({ where: { id: job.id }, data: { status: "QUEUED", attempts: 0, lastError: null } });
    revalidatePath("/admin/print-history");
    return { ok: true, data: undefined };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"]),
});

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  try {
    const { organizationId, role: callerRole } = await requireActiveOrg();
    assertRoleAtLeast(callerRole, "ADMIN");
    const parsed = InviteMemberSchema.parse({ email: formData.get("email"), role: formData.get("role") });

    // Routed through BetterAuth's organization plugin (packages/auth) so
    // invitation-token issuance and the email send (packages/auth's
    // notifications.ts) stay owned by one place instead of being
    // reimplemented here.
    await auth.api.createInvitation({
      headers: await headers(),
      body: { email: parsed.email, role: parsed.role, organizationId },
    });

    revalidatePath("/admin/settings/members");
    return { ok: true, data: undefined };
  } catch (err) {
    return handleActionError(err);
  }
}

function slugify(input: string): string {
  return `${input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${Date.now().toString(36).slice(-4)}`;
}
