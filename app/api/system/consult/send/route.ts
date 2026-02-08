import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { canConsultWith } from "@/lib/system/consult";
import { requireSystemUser } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { getR2Bucket, r2Enabled } from "@/lib/storage/r2";
import { removeStoredObjects, uploadBufferToStorage } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function safeFilename(name: string) {
  return (name || "image.png").replace(/[^\w.\-()+\s]/g, "_").slice(0, 120) || "image.png";
}

function isAllowed(file: File) {
  const name = String(file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";
  const mime = String(file.type || "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(mime);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSystemUser();
    const form = await req.formData().catch(() => null);
    if (!form) return json({ ok: false, error: "INVALID_FORM" }, 400);

    const toUserId = String(form.get("toUserId") || "").trim();
    if (!toUserId || !isUuid(toUserId)) return json({ ok: false, error: "INVALID_PEER" }, 400);

    const textRaw = form.get("text");
    const text = typeof textRaw === "string" ? textRaw.trim().slice(0, 2000) : "";

    const fileRaw = form.get("image");
    const file = fileRaw instanceof File ? fileRaw : null;
    if (!text && !file) return json({ ok: false, error: "EMPTY_MESSAGE" }, 400);

    if (file) {
      if (!isAllowed(file)) return json({ ok: false, error: "INVALID_FILE_TYPE" }, 400);
      if (file.size > MAX_BYTES) return json({ ok: false, error: "FILE_TOO_LARGE" }, 400);
    }

    const allowed = await canConsultWith(ctx, toUserId);
    if (!allowed) return json({ ok: false, error: "FORBIDDEN" }, 403);

    const admin = supabaseAdmin();
    let imagePayload: {
      bucket?: string;
      path?: string;
      name?: string;
      mime?: string | null;
      size?: number;
    } = {};

    if (file) {
      if (!r2Enabled()) return json({ ok: false, error: "R2_NOT_CONFIGURED" }, 500);
      const resolvedCandidates = [getR2Bucket()];

      const safeName = safeFilename(file.name || "image.png");
      const path = `consult/${ctx.user.id}/${Date.now()}-${randomUUID()}-${safeName}`;
      const bytes = await file.arrayBuffer();

      let bucketUsed = resolvedCandidates[0] || "fxlocus-assets";
      let uploadError: Error | null = null;
      for (const candidate of resolvedCandidates) {
        try {
          await uploadBufferToStorage(admin, candidate, path, bytes, file.type || "image/png");
          bucketUsed = candidate;
          uploadError = null;
          break;
        } catch (err: any) {
          uploadError = err instanceof Error ? err : new Error(String(err || "UPLOAD_FAILED"));
          if (!/bucket/i.test(uploadError.message)) break;
        }
      }

      if (uploadError) return json({ ok: false, error: "UPLOAD_FAILED" }, 500);

      imagePayload = {
        bucket: bucketUsed,
        path,
        name: file.name || safeName,
        mime: file.type || null,
        size: file.size
      };
    }

    const contentType = file ? (text ? "mixed" : "image") : "text";
    const { error } = await admin.from("consult_messages").insert({
      from_user_id: ctx.user.id,
      to_user_id: toUserId,
      content_type: contentType,
      content_text: text || null,
      image_bucket: imagePayload.bucket ?? null,
      image_path: imagePayload.path ?? null,
      image_name: imagePayload.name ?? null,
      image_mime_type: imagePayload.mime ?? null,
      image_size_bytes: imagePayload.size ?? null,
      created_at: new Date().toISOString()
    });

    if (error) {
      if (imagePayload.bucket && imagePayload.path) {
        await removeStoredObjects(admin, [{ bucket: imagePayload.bucket, path: imagePayload.path }]);
      }
      return json({ ok: false, error: error.message }, 500);
    }

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
