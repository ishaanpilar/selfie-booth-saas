import { NextResponse } from "next/server";
import { getBoothConfig } from "@/lib/booth/get-booth-config.server";

/**
 * Public, unauthenticated booth bootstrap endpoint — a kiosk only knows its
 * own `boothId` (an unguessable cuid provisioned by an admin), not a user
 * session. Returns only what a guest-facing kiosk needs to render: no
 * organization secrets, no other booths' data. Production hardening would
 * add a device-scoped bearer token (same pairing pattern as the print
 * agent) so a leaked boothId alone can't be used to spoof heartbeats.
 *
 * Used by the kiosk to re-fetch after a reconnect; the initial page load
 * gets the same shape server-rendered by `/booth/[boothId]` directly via
 * `getBoothConfig` (see src/lib/booth/get-booth-config.server.ts).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ boothId: string }> }) {
  const { boothId } = await params;
  const result = await getBoothConfig(boothId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.config);
}
