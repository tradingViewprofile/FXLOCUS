import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpointRaw = process.env.R2_ENDPOINT || "";
const endpoint = endpointRaw
  ? endpointRaw.startsWith("http://") || endpointRaw.startsWith("https://")
    ? endpointRaw
    : `https://${endpointRaw}`
  : "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.R2_BUCKET || "";
const publicBaseRaw = process.env.R2_PUBLIC_BASE_URL || process.env.R2_CDN_BASE_URL || "https://cdn.fxlocus.com";
const publicBase = publicBaseRaw
  ? publicBaseRaw.startsWith("http://") || publicBaseRaw.startsWith("https://")
    ? publicBaseRaw
    : `https://${publicBaseRaw}`
  : "";

let client: S3Client | null = null;

export function r2Enabled() {
  return Boolean(endpoint && accessKeyId && secretAccessKey && bucketName);
}

export function getR2Bucket() {
  return bucketName;
}

export function getR2PublicBaseUrl() {
  return publicBase;
}

export function isR2Bucket(bucket: string | null | undefined) {
  return r2Enabled() && Boolean(bucket && bucket === bucketName);
}

function getClient() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey }
    });
  }
  return client;
}

export async function r2PresignGet(key: string, expiresIn = 3600) {
  if (!r2Enabled()) throw new Error("R2_NOT_CONFIGURED");
  const cmd = new GetObjectCommand({ Bucket: bucketName, Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

export async function r2PresignPut(key: string, contentType: string, expiresIn = 3600) {
  if (!r2Enabled()) throw new Error("R2_NOT_CONFIGURED");
  const cmd = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: contentType });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

export async function r2UploadBuffer(
  key: string,
  body: Buffer | ArrayBuffer | Uint8Array,
  contentType: string
) {
  if (!r2Enabled()) throw new Error("R2_NOT_CONFIGURED");
  const payload: Uint8Array | Buffer = Buffer.isBuffer(body)
    ? body
    : body instanceof Uint8Array
      ? body
      : new Uint8Array(body);
  const cmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: payload,
    ContentType: contentType
  });
  await getClient().send(cmd);
}

export async function r2DeleteObjects(keys: string[]) {
  if (!r2Enabled()) throw new Error("R2_NOT_CONFIGURED");
  if (!keys.length) return;
  const cmd = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: { Objects: keys.map((key) => ({ Key: key })) }
  });
  await getClient().send(cmd);
}

export function r2PublicUrl(key: string) {
  const base = getR2PublicBaseUrl();
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/${String(key || "").replace(/^\/+/, "")}`;
}
