import { readFileSync, statSync, createReadStream } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2PublicUrl } from "../lib/storage/r2";

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist", "desktop");
const exePath = path.join(distDir, "fxlocus_setup.exe");
const metaPath = path.join(distDir, "desktop-package.json");
const pkgPath = path.join(root, "package.json");

function readEnvFile(filePath: string) {
  try {
    const raw = readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    const env: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

const envFile = readEnvFile(path.join(root, ".env.local"));
const endpointRaw = process.env.R2_ENDPOINT || envFile.R2_ENDPOINT || "";
const endpoint =
  endpointRaw && !(endpointRaw.startsWith("http://") || endpointRaw.startsWith("https://"))
    ? `https://${endpointRaw}`
    : endpointRaw;
const accessKeyId = process.env.R2_ACCESS_KEY_ID || envFile.R2_ACCESS_KEY_ID || "";
const secretAccessKey =
  process.env.R2_SECRET_ACCESS_KEY || envFile.R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.R2_BUCKET || envFile.R2_BUCKET || "";
const desktopPrefix = process.env.R2_DESKTOP_PREFIX || envFile.R2_DESKTOP_PREFIX || "desktop";
const cdnBase =
  process.env.R2_CDN_BASE_URL ||
  envFile.R2_CDN_BASE_URL ||
  process.env.R2_PUBLIC_BASE_URL ||
  envFile.R2_PUBLIC_BASE_URL ||
  "";

function ensureR2() {
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    console.error(
      "Missing R2 config. Please set R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET."
    );
    process.exit(1);
  }
}

function readJson(filePath: string) {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey }
  });
}

async function uploadFile(key: string, filePath: string, contentType: string) {
  const stream = createReadStream(filePath);
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: stream as any,
    ContentType: contentType,
    ContentLength: statSync(filePath).size
  });
  await getClient().send(cmd);
}

async function uploadJson(key: string, payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload, null, 2));
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "application/json",
    ContentLength: body.length
  });
  await getClient().send(cmd);
}

async function main() {
  ensureR2();

  const pkg = readJson(pkgPath);
  const version = String(pkg.version || "0.1.0");

  if (!exePath) throw new Error("Missing installer.");
  if (!metaPath) throw new Error("Missing metadata json.");

  const meta = readJson(metaPath);
  const safePrefix = desktopPrefix.replace(/\/+$/, "");
  const exeKey = `${safePrefix}/fxlocus_setup.exe`;
  const metaKey = `${safePrefix}/desktop-package.json`;
  const publicExeUrl =
    r2PublicUrl(exeKey) ||
    (cdnBase ? `${cdnBase.replace(/\/+$/, "")}/${exeKey}` : "");

  const mergedMeta = {
    version,
    builtAt: meta?.builtAt || new Date().toISOString(),
    downloadUrl: publicExeUrl || null,
    sizeBytes: statSync(exePath).size
  };

  await uploadFile(exeKey, exePath, "application/octet-stream");
  await uploadJson(metaKey, mergedMeta);

  console.log(`Desktop assets uploaded to R2: ${exeKey}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
