import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { AssetType } from "@selfie-booth/database";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "selfie-booth-assets";

let client: ReturnType<typeof createClient> | null = null;

/**
 * Service-role Supabase client, server-only. Every upload goes through this
 * one place so bucket naming/path conventions can't drift between routes.
 * The bucket is assumed public-read (guests need to open their photo from a
 * QR code with no auth) — if an organization needs private events, switch
 * this to `createSignedUrl` per-asset instead of `getPublicUrl` below.
 */
function getSupabaseAdmin() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase storage is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export interface UploadedAsset {
  storageKey: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export async function uploadAsset(params: {
  organizationId: string;
  type: AssetType;
  data: Buffer | Uint8Array;
  mimeType: string;
  /** Groups related files under one prefix, e.g. a session id, so an
   * event's assets can be located/purged without a DB round trip. */
  scopeId: string;
}): Promise<UploadedAsset> {
  const supabase = getSupabaseAdmin();
  const ext = EXTENSION_BY_MIME[params.mimeType] ?? "bin";
  const storageKey = `${params.organizationId}/${params.type.toLowerCase()}/${params.scopeId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(storageKey, params.data, {
    contentType: params.mimeType,
    cacheControl: "31536000, immutable",
    upsert: false,
  });
  if (error) {
    throw new Error(`Failed to upload asset to storage: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);

  return {
    storageKey,
    url: publicUrlData.publicUrl,
    sizeBytes: params.data.byteLength,
    mimeType: params.mimeType,
  };
}

export async function deleteAsset(storageKey: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
  if (error) {
    throw new Error(`Failed to delete asset from storage: ${error.message}`);
  }
}
