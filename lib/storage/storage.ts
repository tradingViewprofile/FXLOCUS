import {
  getR2Bucket,
  r2DeleteObjects,
  r2PresignGet,
  r2PresignPut,
  r2PublicUrl,
  r2UploadBuffer
} from "@/lib/storage/r2";

const SIGNED_URL_CACHE_TTL_MS = 5 * 60 * 1000;
const g = globalThis as {
  __fx_signed_url_cache?: Map<string, { exp: number; url: string }>;
};
if (!g.__fx_signed_url_cache) g.__fx_signed_url_cache = new Map();
const signedUrlCache = g.__fx_signed_url_cache;

export type StorageItem = { bucket: string; path: string };

export async function createSignedDownloadUrl(
  adminOrBucket: any,
  bucketOrPath: string,
  pathOrExpires?: string | number,
  expiresInMaybe = 3600
) {
  const bucket = typeof adminOrBucket === "string" ? adminOrBucket : bucketOrPath;
  const path = typeof adminOrBucket === "string" ? String(bucketOrPath) : String(pathOrExpires || "");
  const expiresIn =
    typeof adminOrBucket === "string" ? Number(pathOrExpires || 3600) : Number(expiresInMaybe || 3600);

  const cacheKey = `${bucket}|${path}|${expiresIn}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.url;

  let url: string | null = null;
  const r2Bucket = getR2Bucket();
  const isR2 = Boolean(bucket && r2Bucket && bucket === r2Bucket);
  if (isR2) {
    try {
      url = await r2PresignGet(path, expiresIn);
    } catch {
      // ignore and fall back to public CDN if configured
    }
    if (!url) {
      url = r2PublicUrl(path);
    }
  }
  if (!url) return null;
  const ttl = Math.min(SIGNED_URL_CACHE_TTL_MS, Math.max(60_000, (expiresIn - 60) * 1000));
  signedUrlCache.set(cacheKey, { exp: Date.now() + ttl, url });
  return url;
}

export async function createSignedUploadUrl(
  adminOrBucket: any,
  bucketOrPath: string,
  pathOrContentType: string,
  contentTypeOrExpires?: string | number,
  expiresInMaybe = 3600
) {
  const bucket = typeof adminOrBucket === "string" ? adminOrBucket : bucketOrPath;
  const path = typeof adminOrBucket === "string" ? bucketOrPath : pathOrContentType;
  const contentType =
    typeof adminOrBucket === "string"
      ? String(pathOrContentType || "application/octet-stream")
      : String(contentTypeOrExpires || "application/octet-stream");
  const expiresIn =
    typeof adminOrBucket === "string" ? Number(contentTypeOrExpires || 3600) : Number(expiresInMaybe || 3600);

  const r2Bucket = getR2Bucket();
  if (!bucket || !r2Bucket || bucket !== r2Bucket) {
    return { uploadUrl: null as string | null, token: null as string | null };
  }
  const uploadUrl = await r2PresignPut(path, contentType || "application/octet-stream", expiresIn);
  return { uploadUrl, token: null as string | null };
}

export async function uploadBufferToStorage(
  adminOrBucket: any,
  bucketOrPath: string,
  pathOrBody: string | Buffer | ArrayBuffer,
  bodyOrContentType: Buffer | ArrayBuffer | string,
  contentTypeMaybe?: string
) {
  const bucket = typeof adminOrBucket === "string" ? adminOrBucket : bucketOrPath;
  const path = typeof adminOrBucket === "string" ? bucketOrPath : String(pathOrBody || "");
  const body = (typeof adminOrBucket === "string" ? pathOrBody : bodyOrContentType) as
    | Buffer
    | ArrayBuffer;
  const contentType =
    typeof adminOrBucket === "string"
      ? String(bodyOrContentType || "application/octet-stream")
      : String(contentTypeMaybe || "application/octet-stream");

  const r2Bucket = getR2Bucket();
  if (!bucket || !r2Bucket || bucket !== r2Bucket) {
    throw new Error("Only R2 storage is supported.");
  }
  await r2UploadBuffer(path, body, contentType || "application/octet-stream");
}

export async function removeStoredObjects(
  adminOrItems: any,
  maybeItems?: StorageItem[]
) {
  const items: StorageItem[] = Array.isArray(adminOrItems) ? adminOrItems : maybeItems || [];
  if (!items.length) return;
  const r2Keys: string[] = [];
  items.forEach((item) => {
    const r2Bucket = getR2Bucket();
    if (r2Bucket && item.bucket === r2Bucket) {
      r2Keys.push(item.path);
      return;
    }
  });

  if (r2Keys.length) {
    await r2DeleteObjects(r2Keys);
  }
}
