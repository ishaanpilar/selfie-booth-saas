import { PrismaClient, MemberRole, TemplateLayoutType } from "../generated/client/index.js";

const prisma = new PrismaClient();

/**
 * Seeds a demo organization with an event, booth, and the three standard
 * film-strip templates (2/3/4 photo). User accounts are intentionally not
 * seeded here — create the first account through the app's sign-up flow
 * (BetterAuth owns password hashing), then run `npm run db:seed -- --owner
 * <email>` is not implemented; instead promote the account to OWNER via
 * the admin dashboard or a one-off `prisma.member.create` call.
 */
async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-events-co" },
    update: {},
    create: {
      name: "Demo Events Co.",
      slug: "demo-events-co",
    },
  });

  const event = await prisma.event.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "summer-gala-2026" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Summer Gala 2026",
      slug: "summer-gala-2026",
      status: "DRAFT",
      settings: {
        guestFields: ["name", "email"],
        shareEnabled: true,
        printEnabled: true,
      },
    },
  });

  const booth = await prisma.booth.create({
    data: {
      organizationId: org.id,
      name: "Booth 1 — Main Entrance",
      status: "OFFLINE",
      settings: {
        cameraSource: "webcam",
        countdownSeconds: 3,
        burstCount: 1,
      },
    },
  });

  await prisma.eventBooth.create({
    data: { eventId: event.id, boothId: booth.id },
  });

  const templates: Array<{
    name: string;
    layoutType: TemplateLayoutType;
    widthMm: number;
    heightMm: number;
    slots: number;
  }> = [
    { name: "Classic 2-Photo Strip", layoutType: TemplateLayoutType.STRIP_2, widthMm: 50.8, heightMm: 152.4, slots: 2 },
    { name: "Classic 3-Photo Strip", layoutType: TemplateLayoutType.STRIP_3, widthMm: 50.8, heightMm: 152.4, slots: 3 },
    { name: "Classic 4-Photo Strip", layoutType: TemplateLayoutType.STRIP_4, widthMm: 50.8, heightMm: 152.4, slots: 4 },
  ];

  for (const t of templates) {
    const slotHeight = (t.heightMm - 10) / t.slots;
    await prisma.template.create({
      data: {
        organizationId: org.id,
        name: t.name,
        layoutType: t.layoutType,
        widthMm: t.widthMm,
        heightMm: t.heightMm,
        dpi: 300,
        isDefault: t.layoutType === TemplateLayoutType.STRIP_3,
        design: {
          version: 1,
          background: "#ffffff",
          bleedMm: 3,
          safeMarginMm: 3,
          slots: Array.from({ length: t.slots }, (_, i) => ({
            id: `photo-${i + 1}`,
            type: "photo",
            xMm: 5,
            yMm: 5 + i * slotHeight,
            widthMm: t.widthMm - 10,
            heightMm: slotHeight - 2,
          })),
          layers: [
            {
              id: "footer-text",
              type: "text",
              text: "{{event.name}} · {{session.date}}",
              xMm: 5,
              yMm: t.heightMm - 8,
              widthMm: t.widthMm - 10,
              heightMm: 6,
              fontSize: 6,
              align: "center",
            },
            {
              id: "qr-code",
              type: "qr",
              binding: "session.shareUrl",
              xMm: t.widthMm - 12,
              yMm: t.heightMm - 8,
              widthMm: 8,
              heightMm: 8,
            },
          ],
        },
      },
    });
  }

  console.log(`Seeded organization "${org.name}" (${org.id}) with event "${event.name}" and booth "${booth.name}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
