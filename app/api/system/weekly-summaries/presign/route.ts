import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireLearner } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { getR2Bucket, r2Enabled } from "@/lib/storage/r2";
import { createSignedUploadUrl } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const DOC_EXTENSIONS = new Set(["doc", "docx", "pdf", "txt"]);
const DOC_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/plain"
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type PresignFile = {
  key?: "strategy" | "curve" | "stats";
  name?: string;
  size?: number;
  type?: string;
};

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function safeFilename(name: string, fallback: string) {
  const raw = name && name.trim() ? name : fallback;
  return raw.replace(/[^\w.\-()+\s]/g, "_").slice(0, 120) || fallback;
}

function isAllowedMeta(name: string, mime: string | null, mode: "image" | "doc") {
  const lower = String(name || "").toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop() || "" : "";
  const safeMime = String(mime || "").toLowerCase();
  if (mode === "doc") {
    return DOC_EXTENSIONS.has(ext) || DOC_MIME_TYPES.has(safeMime);
  }
  return IMAGE_EXTENSIONS.has(ext) || IMAGE_MIME_TYPES.has(safeMime);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireLearner();
    if (!r2Enabled()) return json({ ok: false, error: "R2_NOT_CONFIGURED" }, 500);
    const payload = await req.json().catch(() => null);
    const rawFiles = Array.isArray(payload?.files) ? (payload.files as PresignFile[]) : [];
    if (!rawFiles.length) return json({ ok: false, error: "MISSING_FILES" }, 400);
    if (rawFiles.length > 3) return json({ ok: false, error: "TOO_MANY_FILES" }, 400);

    const entryIdRaw = typeof payload?.entryId === "string" ? payload.entryId.trim() : "";
    if (entryIdRaw && !isUuid(entryIdRaw)) return json({ ok: false, error: "INVALID_ENTRY" }, 400);
    const entryId = entryIdRaw || randomUUID();

    const allowedKeys = new Set(["strategy", "curve", "stats"]);
    const keys = rawFiles.map((f) => f.key).filter(Boolean) as Array<"strategy" | "curve" | "stats">;
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) return json({ ok: false, error: "INVALID_FILES" }, 400);
    if (keys.some((key) => !allowedKeys.has(key))) return json({ ok: false, error: "INVALID_FILES" }, 400);
    if (!entryIdRaw && uniqueKeys.size < 3) return json({ ok: false, error: "MISSING_FILES" }, 400);

    const uploadMode = user.role === "assistant" ? "doc" : "image";
    const admin = supabaseAdmin();

    if (entryIdRaw) {
      const { data: existing, error: existingErr } = await admin
        .from("weekly_summaries")
        .select("id,user_id")
        .eq("id", entryId)
        .maybeSingle();
      if (existingErr) return json({ ok: false, error: existingErr.message }, 500);
      if (!existing?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
      if (existing.user_id !== user.id) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const bucketCandidates = [getR2Bucket()];

    const uploads: Array<{
      key: "strategy" | "curve" | "stats";
      bucket: string;
      path: string;
      token?: string | null;
      uploadUrl?: string | null;
      fileName: string;
      mimeType: string | null;
      size: number;
    }> = [];

    for (const file of rawFiles) {
      const key = file.key;
      if (!key) return json({ ok: false, error: "INVALID_FILES" }, 400);
      const originalName = String(file.name || "").trim();
      const safeName = safeFilename(originalName, `${key}.${uploadMode === "doc" ? "txt" : "png"}`);
      const displayName = originalName || safeName;
      const mimeType = file.type ? String(file.type) : null;
      const size = Number(file.size || 0);
      if (!Number.isFinite(size) || size <= 0) return json({ ok: false, error: "INVALID_SIZE" }, 400);
      if (size > MAX_FILE_BYTES) return json({ ok: false, error: "FILE_TOO_LARGE" }, 400);
      if (!isAllowedMeta(displayName, mimeType, uploadMode)) {
        return json({ ok: false, error: "INVALID_FILE_TYPE" }, 400);
      }

      const path = `weekly-summaries/${user.id}/${entryId}/${Date.now()}-${key}-${safeName}`;

      const bucketUsed = bucketCandidates[0] || "fxlocus-assets";
      const signed = await createSignedUploadUrl(
        admin,
        bucketUsed,
        path,
        mimeType || "application/octet-stream",
        3600
      );
      if (!signed.uploadUrl && !signed.token) {
        return json({ ok: false, error: "SIGNED_URL_FAILED" }, 500);
      }

      uploads.push({
        key,
        bucket: bucketUsed,
        path,
        token: signed.token,
        uploadUrl: signed.uploadUrl,
        fileName: displayName,
        mimeType,
        size
      });
    }

    return json({ ok: true, entryId, uploads });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
