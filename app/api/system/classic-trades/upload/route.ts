import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireLearner } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { buildStudentSubmitContent, notifyLeadersAndAdmins } from "@/lib/system/notify";
import { getR2Bucket, r2Enabled } from "@/lib/storage/r2";
import { removeStoredObjects, uploadBufferToStorage } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: Request) {
  try {
    const { user } = await requireLearner();
    if (!r2Enabled()) return json({ ok: false, error: "R2_NOT_CONFIGURED" }, 500);
    const form = await req.formData().catch(() => null);
    if (!form) return json({ ok: false, error: "INVALID_FORM" }, 400);

    const reasonRaw = form.get("reason");
    const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : "";
    if (!reason) return json({ ok: false, error: "MISSING_REASON" }, 400);

    const file = form.get("file");
    if (!(file instanceof File)) return json({ ok: false, error: "MISSING_FILE" }, 400);
    if (!isAllowed(file)) return json({ ok: false, error: "INVALID_FILE_TYPE" }, 400);
    if (file.size > MAX_BYTES) return json({ ok: false, error: "FILE_TOO_LARGE" }, 400);

    const entryIdRaw = form.get("entryId");
    const entryId = typeof entryIdRaw === "string" ? entryIdRaw.trim() : "";
    if (entryId && !isUuid(entryId)) return json({ ok: false, error: "INVALID_ENTRY" }, 400);

    const admin = supabaseAdmin();
    const now = new Date().toISOString();
    let oldFile: { bucket: string; path: string } | null = null;

    if (entryId) {
      const { data: existing, error: existingErr } = await admin
        .from("classic_trades")
        .select("id,user_id,image_bucket,image_path")
        .eq("id", entryId)
        .maybeSingle();
      if (existingErr) return json({ ok: false, error: existingErr.message }, 500);
      if (!existing?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
      if (existing.user_id !== user.id) return json({ ok: false, error: "FORBIDDEN" }, 403);
      if (existing.image_bucket && existing.image_path) {
        oldFile = { bucket: existing.image_bucket, path: existing.image_path };
      }
    }

    const bucketCandidates = [getR2Bucket()];
    const bucket = bucketCandidates[0] || "fxlocus-assets";
    const safeName = safeFilename(file.name || "image.png");
    const path = `classic-trades/${user.id}/${Date.now()}-${randomUUID()}-${safeName}`;
    const bytes = await file.arrayBuffer();

    let bucketUsed = bucket;
    let uploadError: Error | null = null;
    for (const candidate of bucketCandidates.length ? bucketCandidates : [bucket]) {
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

    if (entryId) {
      const { error: upErr } = await admin
        .from("classic_trades")
        .update({
          reason,
          leader_id: user.leader_id,
          image_bucket: bucketUsed,
          image_path: path,
          image_name: file.name || safeName,
          image_mime_type: file.type || null,
          reviewed_at: null,
          reviewed_by: null,
          review_note: null,
          updated_at: now
        } as any)
        .eq("id", entryId);
      if (upErr) {
        await removeStoredObjects(admin, [{ bucket: bucketUsed, path }]);
        return json({ ok: false, error: "DB_ERROR" }, 500);
      }

      if (oldFile) {
        await removeStoredObjects(admin, [oldFile]);
      }

      await notifyLeadersAndAdmins(user, {
        title: "经典交易提交 / Classic trade submitted",
        content: buildStudentSubmitContent(user, "更新了经典交易�?, "updated a classic trade.")
      });

      return json({ ok: true, id: entryId });
    }

    const { data: row, error: insertErr } = await admin
      .from("classic_trades")
      .insert({
        user_id: user.id,
        leader_id: user.leader_id,
        reason,
        image_bucket: bucketUsed,
        image_path: path,
        image_name: file.name || safeName,
        image_mime_type: file.type || null,
        created_at: now,
        updated_at: now
      } as any)
      .select("id")
      .single();

    if (insertErr || !row?.id) {
      await removeStoredObjects(admin, [{ bucket: bucketUsed, path }]);
      return json({ ok: false, error: "DB_ERROR" }, 500);
    }

    await notifyLeadersAndAdmins(user, {
      title: "经典交易提交 / Classic trade submitted",
      content: buildStudentSubmitContent(user, "提交了经典交易�?, "submitted a classic trade.")
    });

    return json({ ok: true, id: row.id });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
