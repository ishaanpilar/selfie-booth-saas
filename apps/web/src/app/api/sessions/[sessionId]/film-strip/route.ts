import { NextResponse } from "next/server";
import { prisma } from "@selfie-booth/database";
import { uploadAsset } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const session = await prisma.photoSession.findUnique({
    where: { id: sessionId },
    include: { event: { select: { organizationId: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const templateId = form.get("templateId");
  const widthPx = Number(form.get("widthPx"));
  const heightPx = Number(form.get("heightPx"));
  const dpi = Number(form.get("dpi"));

  if (!(file instanceof File) || typeof templateId !== "string" || !Number.isFinite(widthPx) || !Number.isFinite(heightPx) || !Number.isFinite(dpi)) {
    return NextResponse.json({ error: "Missing file, templateId, widthPx, heightPx, or dpi." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 40MB upload limit." }, { status: 413 });
  }

  const organizationId = session.event.organizationId;
  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await uploadAsset({
    organizationId,
    type: "FILM_STRIP",
    data: buffer,
    mimeType: file.type || "image/png",
    scopeId: sessionId,
  });

  const assetRow = await prisma.asset.create({
    data: {
      organizationId,
      type: "FILM_STRIP",
      storageKey: asset.storageKey,
      url: asset.url,
      mimeType: asset.mimeType,
      widthPx,
      heightPx,
      dpi,
      sizeBytes: asset.sizeBytes,
    },
  });

  const filmStrip = await prisma.filmStrip.create({
    data: { sessionId, templateId, assetId: assetRow.id },
  });

  await prisma.photoSession.update({ where: { id: sessionId }, data: { completedAt: new Date() } });
  await prisma.analyticsEvent.create({
    data: { organizationId, eventId: session.eventId, boothId: session.boothId, type: "FILM_STRIP_GENERATED" },
  });

  return NextResponse.json({ filmStripId: filmStrip.id, assetUrl: asset.url }, { status: 201 });
}
