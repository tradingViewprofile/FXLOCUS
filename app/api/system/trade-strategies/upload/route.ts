import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireLearner } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { getR2Bucket, r2Enabled } from "@/lib/storage/r2";
import { removeStoredObjects, uploadBufferToStorage } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg"
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type JsonFileInput = {
  bucket?: string;
  path?: string;
  fileName?: string;
  size?: number;
  mimeType?: string | null;
};

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function safeFilename(name: string) {
  return (name || "upload.bin").replace(/[^\w.\-()+\s]/g, "_").slice(0, 120) || "upload.bin";
}

function isAllowed(file: File) {
  const name = String(file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";
  const mime = String(file.type || "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(mime);
}

function isAllowedMeta(name: string, mime: string | null) {
  const lower = String(name || "").toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop() || "" : "";
  const safeMime = String(mime || "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(safeMime);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function notifyAdmins(
  admin: ReturnType<typeof supabaseAdmin>,
  user: { id: string; email?: string | null; full_name?: string | null; leader_id?: string | null }
) {
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "super_admin");
  const targets = new Set<string>();
  if (user.leader_id) targets.add(user.leader_id);
  (admins || []).forEach((a: any) => {
    if (a?.id) targets.add(a.id);
  });

  if (!targets.size) return;
  const label = user.full_name || user.email || user.id.slice(0, 6);
  await admin.from("notifications").insert(
    Array.from(targets).map((id) => ({
      to_user_id: id,
      from_user_id: user.id,
      title: "交易策略提交 / Trade strategy submitted",
      content: `学员 ${label} 已提交交易策略。\n\nStudent ${label} submitted trade strategies.`
    })) as any
  );
}

export async function POST(req: Request) {
  try {
    const { user } = await requireLearner();
    const admin = supabaseAdmin();
    const now = new Date().toISOString();
    if (!r2Enabled()) return json({ ok: false, error: "R2_NOT_CONFIGURED" }, 500);
    const bucketCandidates = [getR2Bucket()];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await req.json().catch(() => null);
      const rawFiles = Array.isArray(payload?.files) ? (payload.files as JsonFileInput[]) : [];
      if (!rawFiles.length) return json({ ok: false, error: "MISSING_FILES" }, 400);
      if (rawFiles.length > 3) return json({ ok: false, error: "TOO_MANY_FILES" }, 400);

      const replace = payload?.replace === true;
      const submissionIdRaw = typeof payload?.submissionId === "string" ? payload.submissionId.trim() : "";
      if (replace && !submissionIdRaw) return json({ ok: false, error: "INVALID_SUBMISSION" }, 400);
      if (submissionIdRaw && !isUuid(submissionIdRaw)) {
        return json({ ok: false, error: "INVALID_SUBMISSION" }, 400);
      }

      const submissionId = submissionIdRaw || randomUUID();
      const expectedPrefix = `trade-strategies/${user.id}/${submissionId}/`;
      const normalizedFiles = rawFiles.map((file) => {
        const fileName = String(file.fileName || "").trim();
        const safeName = safeFilename(fileName);
        return {
          bucket: String(file.bucket || "").trim(),
          path: String(file.path || "").trim(),
          fileName: fileName || safeName,
          size: Number(file.size || 0),
          mimeType: file.mimeType ? String(file.mimeType) : null
        };
      });

      for (const file of normalizedFiles) {
        if (!file.path || !file.bucket) return json({ ok: false, error: "INVALID_FILE" }, 400);
        if (!bucketCandidates.includes(file.bucket)) {
          return json({ ok: false, error: "INVALID_BUCKET" }, 400);
        }
        if (!file.path.startsWith(expectedPrefix)) {
          return json({ ok: false, error: "INVALID_PATH" }, 400);
        }
        if (!isAllowedMeta(file.fileName, file.mimeType)) {
          return json({ ok: false, error: "INVALID_FILE_TYPE" }, 400);
        }
        if (!Number.isFinite(file.size) || file.size <= 0) {
          return json({ ok: false, error: "INVALID_SIZE" }, 400);
        }
        if (file.size > MAX_FILE_BYTES) return json({ ok: false, error: "FILE_TOO_LARGE" }, 400);
      }

      let oldFiles: Array<{ id: string; storage_bucket: string; storage_path: string }> = [];

      if (replace) {
        const { data: existing, error: existingErr } = await admin
          .from("trade_submissions")
          .select("id,user_id,type,status")
          .eq("id", submissionId)
          .maybeSingle();

        if (existingErr) return json({ ok: false, error: existingErr.message }, 500);
        if (!existing?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
        if (existing.user_id !== user.id || existing.type !== "trade_strategy") {
          return json({ ok: false, error: "FORBIDDEN" }, 403);
        }
        if (existing.status !== "submitted") {
          return json({ ok: false, error: "ALREADY_REVIEWED" }, 400);
        }

        const { data: existingFiles, error: filesErr } = await admin
          .from("trade_submission_files")
          .select("id,storage_bucket,storage_path")
          .eq("submission_id", submissionId);
        if (filesErr) return json({ ok: false, error: filesErr.message }, 500);
        oldFiles = (existingFiles || []) as any;
      } else {
        const submission = await admin
          .from("trade_submissions")
          .insert({
            id: submissionId,
            user_id: user.id,
            leader_id: user.leader_id,
            type: "trade_strategy",
            status: "submitted",
            created_at: now,
            updated_at: now
          } as any)
          .select("id")
          .single();

        if (submission.error) return json({ ok: false, error: submission.error.message }, 500);
      }

      const fileRows = normalizedFiles.map((file) => ({
        submission_id: submissionId,
        file_name: file.fileName,
        storage_bucket: file.bucket,
        storage_path: file.path,
        size_bytes: file.size,
        mime_type: file.mimeType,
        created_at: now
      }));

      const filesInsert = await admin.from("trade_submission_files").insert(fileRows as any);
      if (filesInsert.error) return json({ ok: false, error: filesInsert.error.message }, 500);

      if (replace) {
        const reset = await admin
          .from("trade_submissions")
          .update({
            leader_id: user.leader_id,
            status: "submitted",
            review_note: null,
            rejection_reason: null,
            reviewed_at: null,
            reviewed_by: null,
            created_at: now,
            updated_at: now
          } as any)
          .eq("id", submissionId);
        if (reset.error) return json({ ok: false, error: reset.error.message }, 500);

        if (oldFiles.length) {
          const oldIds = oldFiles.map((f) => f.id);
          const del = await admin.from("trade_submission_files").delete().in("id", oldIds);
          if (del.error) return json({ ok: false, error: del.error.message }, 500);

          await removeStoredObjects(
            admin,
            oldFiles.map((file) => ({ bucket: file.storage_bucket, path: file.storage_path }))
          );
        }
      }

      await notifyAdmins(admin, user);
      return json({ ok: true, id: submissionId });
    }

    const form = await req.formData().catch(() => null);
    if (!form) return json({ ok: false, error: "INVALID_FORM" }, 400);

    const files = form.getAll("files").filter((f) => f instanceof File) as File[];
    if (!files.length) return json({ ok: false, error: "MISSING_FILES" }, 400);
    if (files.length > 3) return json({ ok: false, error: "TOO_MANY_FILES" }, 400);

    for (const file of files) {
      if (!isAllowed(file)) return json({ ok: false, error: "INVALID_FILE_TYPE" }, 400);
      if (file.size > MAX_FILE_BYTES) return json({ ok: false, error: "FILE_TOO_LARGE" }, 400);
    }

    const submissionId = randomUUID();

    const submission = await admin
      .from("trade_submissions")
      .insert({
        id: submissionId,
        user_id: user.id,
        leader_id: user.leader_id,
        type: "trade_strategy",
        status: "submitted",
        created_at: now,
        updated_at: now
      } as any)
      .select("id")
      .single();

    if (submission.error) return json({ ok: false, error: submission.error.message }, 500);

    const uploaded: Array<{ bucket: string; path: string }> = [];
    const fileRows: any[] = [];

    try {
      const uploadOne = async (file: File) => {
        const originalName = String(file.name || "").trim();
        const safeName = safeFilename(originalName);
        const displayName = originalName || safeName;
        const path = `trade-strategies/${user.id}/${submissionId}/${Date.now()}-${randomUUID()}-${safeName}`;
        const bytes = await file.arrayBuffer();

        let bucketUsed = bucketCandidates[0] || "fxlocus-assets";
        let uploadError: Error | null = null;
        for (const candidate of bucketCandidates.length ? bucketCandidates : [bucketUsed]) {
          try {
            await uploadBufferToStorage(
              admin,
              candidate,
              path,
              bytes,
              file.type || "application/octet-stream"
            );
            bucketUsed = candidate;
            uploadError = null;
            break;
          } catch (err: any) {
            uploadError = err instanceof Error ? err : new Error(String(err || "UPLOAD_FAILED"));
            if (!/bucket/i.test(uploadError.message)) break;
          }
        }
        if (uploadError) throw uploadError;

        uploaded.push({ bucket: bucketUsed, path });
        return {
          submission_id: submissionId,
          file_name: displayName,
          storage_bucket: bucketUsed,
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type || null,
          created_at: now
        };
      };

      const rows = await Promise.all(files.map((file) => uploadOne(file)));
      fileRows.push(...rows);

      const filesInsert = await admin.from("trade_submission_files").insert(fileRows as any);
      if (filesInsert.error) throw new Error(filesInsert.error.message);
    } catch (err: any) {
      await removeStoredObjects(admin, uploaded);
      await admin.from("trade_submission_files").delete().eq("submission_id", submissionId);
      await admin.from("trade_submissions").delete().eq("id", submissionId);
      return json({ ok: false, error: err?.message || "UPLOAD_FAILED" }, 500);
    }

    await notifyAdmins(admin, user);

    return json({ ok: true, id: submissionId });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
