import { NextResponse } from "next/server";
import { prisma } from "@selfie-booth/database";
import { uploadAsset } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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
  const photoId = form.get("photoId"); // client-generated, see booth-api.ts
  const sequence = Number(form.get("sequence"));
  const widthPx = Number(form.get("widthPx"));
  const heightPx = Number(form.get("heightPx"));

  if (!(file instanceof File) || typeof photoId !== "string" || !photoId || !Number.isFinite(sequence) || !Number.isFinite(widthPx) || !Number.isFinite(heightPx)) {
    return NextResponse.json({ error: "Missing file, photoId, sequence, widthPx, or heightPx." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25MB upload limit." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await uploadAsset({
    organizationId: session.event.organizationId,
    type: "ORIGINAL",
    data: buffer,
    mimeType: file.type || "image/png",
    scopeId: sessionId,
  });

  const assetRow = await prisma.asset.create({
    data: {
      organizationId: session.event.organizationId,
      type: "ORIGINAL",
      storageKey: asset.storageKey,
      url: asset.url,
      mimeType: asset.mimeType,
      widthPx,
      heightPx,
      sizeBytes: asset.sizeBytes,
    },
  });

  const photo = await prisma.photo.upsert({
    where: { sessionId_sequence: { sessionId, sequence } },
    update: { originalAssetId: assetRow.id },
    create: { id: photoId, sessionId, sequence, originalAssetId: assetRow.id },
  });

  await prisma.analyticsEvent.create({
    data: { organizationId: session.event.organizationId, eventId: session.eventId, boothId: session.boothId, type: "PHOTO_CAPTURED" },
  });

  return NextResponse.json({ photoId: photo.id, assetUrl: asset.url }, { status: 201 });
}
