import { NextResponse } from "next/server";
import { prisma, Prisma } from "@selfie-booth/database";
import { uploadAsset } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Uploads the edited render of a photo (crop/rotate/filter/stickers/text
 * baked in) and records the non-destructive edit state alongside it, so the
 * original is never overwritten and edits can be redone against it later. */
export async function PATCH(request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { session: { include: { event: { select: { organizationId: true } } } } },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const widthPx = Number(form.get("widthPx"));
  const heightPx = Number(form.get("heightPx"));
  const editsRaw = form.get("edits");

  if (!(file instanceof File) || !Number.isFinite(widthPx) || !Number.isFinite(heightPx)) {
    return NextResponse.json({ error: "Missing file, widthPx, or heightPx." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25MB upload limit." }, { status: 413 });
  }

  const organizationId = photo.session.event.organizationId;
  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await uploadAsset({
    organizationId,
    type: "EDITED",
    data: buffer,
    mimeType: file.type || "image/png",
    scopeId: photo.sessionId,
  });

  const assetRow = await prisma.asset.create({
    data: {
      organizationId,
      type: "EDITED",
      storageKey: asset.storageKey,
      url: asset.url,
      mimeType: asset.mimeType,
      widthPx,
      heightPx,
      sizeBytes: asset.sizeBytes,
    },
  });

  let edits: Prisma.InputJsonValue | undefined;
  if (typeof editsRaw === "string") {
    try {
      edits = JSON.parse(editsRaw) as Prisma.InputJsonValue;
    } catch {
      return NextResponse.json({ error: "`edits` was not valid JSON." }, { status: 400 });
    }
  }

  await prisma.photo.update({
    where: { id: photoId },
    data: { editedAssetId: assetRow.id, edits },
  });

  return NextResponse.json({ assetUrl: asset.url }, { status: 200 });
}
