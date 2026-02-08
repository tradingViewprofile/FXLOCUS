import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireLearner } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { buildStudentSubmitContent, notifyLeadersAndAdmins } from "@/lib/system/notify";
import { getR2Bucket, r2Enabled } from "@/lib/storage/r2";
import { removeStoredObjects, uploadBufferToStorage } from "@/lib/storage/storage";

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
const MAX_BYTES = 10 * 1024 * 1024;

type JsonFileInput = {
  key?: "strategy" | "curve" | "stats";
  bucket?: string;
  path?: string;
  fileName?: string;
  size?: number;
  mimeType?: string | null;
};

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function safeFilename(name: string, fallback: string) {
  const raw = name && name.trim() ? name : fallback;
  return raw.replace(/[^\w.\-()+\s]/g, "_").slice(0, 120) || fallback;
}

function isAllowed(file: File, mode: "image" | "doc") {
  const name = String(file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";
  const mime = String(file.type || "").toLowerCase();
  if (mode === "doc") {
    return DOC_EXTENSIONS.has(ext) || DOC_MIME_TYPES.has(mime);
  }
  return IMAGE_EXTENSIONS.has(ext) || IMAGE_MIME_TYPES.has(mime);
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

async function uploadFile(
  admin: ReturnType<typeof supabaseAdmin>,
  bucketCandidates: string[],
  file: File,
  prefix: string,
  userId: string,
  defaultExt: string
) {
  const safeName = safeFilename(file.name || "", `${prefix}.${defaultExt}`);
  const path = `weekly-summaries/${userId}/${Date.now()}-${randomUUID()}-${prefix}-${safeName}`;
  const bytes = await file.arrayBuffer();

  let bucketUsed = bucketCandidates[0];
  let uploadError: Error | null = null;
  for (const candidate of bucketCandidates) {
    try {
      await uploadBufferToStorage(admin, candidate, path, bytes, file.type || "application/octet-stream");
      bucketUsed = candidate;
      uploadError = null;
      break;
    } catch (err: any) {
      uploadError = err instanceof Error ? err : new Error(String(err || "UPLOAD_FAILED"));
      if (!/bucket/i.test(uploadError.message)) break;
    }
  }

  if (uploadError) throw uploadError;

  return {
    bucket: bucketUsed,
    path,
    name: file.name || safeName,
    mime: file.type || null
  };
}

export async function POST(req: Request) {
  try {
    const { user } = await requireLearner();
    if (!r2Enabled()) return json({ ok: false, error: "R2_NOT_CONFIGURED" }, 500);
    const uploadMode = user.role === "assistant" ? "doc" : "image";
    const defaultExt = uploadMode === "doc" ? "txt" : "png";
    const contentType = req.headers.get("content-type") || "";

    const fallbackLabel = user.id ? user.id.slice(0, 6) : "student";
    const studentName = String(user.full_name || user.email || fallbackLabel).trim();

    if (contentType.includes("application/json")) {
      const payload = await req.json().catch(() => null);
      const summaryText = String(payload?.summaryText || "").trim();
      if (!summaryText) return json({ ok: false, error: "MISSING_SUMMARY" }, 400);
      const entryId = typeof payload?.entryId === "string" ? payload.entryId.trim() : "";
      if (!entryId || !isUuid(entryId)) return json({ ok: false, error: "INVALID_ENTRY" }, 400);

      const rawFiles = Array.isArray(payload?.files) ? (payload.files as JsonFileInput[]) : [];
      const normalizedFiles = rawFiles.map((file) => {
        const key = file.key;
        const fileName = String(file.fileName || "").trim();
        const safeName = safeFilename(fileName, `${key || "file"}.${defaultExt}`);
        return {
          key,
          bucket: String(file.bucket || "").trim(),
          path: String(file.path || "").trim(),
          fileName: fileName || safeName,
          size: Number(file.size || 0),
          mimeType: file.mimeType ? String(file.mimeType) : null
        };
      });

      const allowedKeys = new Set(["strategy", "curve", "stats"]);
      const keySet = new Set<string>();
      for (const file of normalizedFiles) {
        if (!file.key || !allowedKeys.has(file.key) || keySet.has(file.key)) {
          return json({ ok: false, error: "INVALID_FILES" }, 400);
        }
        keySet.add(file.key);
      }

      const expectedPrefix = `weekly-summaries/${user.id}/${entryId}/`;
      const bucketCandidates = [getR2Bucket()];

      for (const file of normalizedFiles) {
        if (!file.path || !file.bucket) return json({ ok: false, error: "INVALID_FILE" }, 400);
        if (!bucketCandidates.includes(file.bucket)) {
          return json({ ok: false, error: "INVALID_BUCKET" }, 400);
        }
        if (!file.path.startsWith(expectedPrefix)) {
          return json({ ok: false, error: "INVALID_PATH" }, 400);
        }
        if (!isAllowedMeta(file.fileName, file.mimeType, uploadMode)) {
          return json({ ok: false, error: "INVALID_FILE_TYPE" }, 400);
        }
        if (!Number.isFinite(file.size) || file.size <= 0) {
          return json({ ok: false, error: "INVALID_SIZE" }, 400);
        }
        if (file.size > MAX_BYTES) return json({ ok: false, error: "FILE_TOO_LARGE" }, 400);
      }

      const admin = supabaseAdmin();
      const now = new Date().toISOString();

      const { data: existing, error: existingErr } = await admin
        .from("weekly_summaries")
        .select(
          "id,user_id,strategy_bucket,strategy_path,curve_bucket,curve_path,stats_bucket,stats_path"
        )
        .eq("id", entryId)
        .maybeSingle();
      if (existingErr) return json({ ok: false, error: existingErr.message }, 500);
      if (existing?.id && existing.user_id !== user.id) {
        return json({ ok: false, error: "FORBIDDEN" }, 403);
      }

      const isNew = !existing?.id;
      if (isNew && keySet.size < 3) return json({ ok: false, error: "MISSING_FILES" }, 400);

      const fileByKey = new Map(normalizedFiles.map((file) => [file.key as string, file]));
      const payloadUpdate: Record<string, unknown> = {
        student_name: studentName,
        summary_text: summaryText,
        leader_id: user.leader_id,
        reviewed_at: null,
        reviewed_by: null,
        review_note: null,
        updated_at: now
      };

      const replaced: Array<{ bucket: string; path: string }> = [];
      const addFile = (key: "strategy" | "curve" | "stats") => {
        const file = fileByKey.get(key);
        if (!file) return;
        payloadUpdate[`${key}_bucket`] = file.bucket;
        payloadUpdate[`${key}_path`] = file.path;
        payloadUpdate[`${key}_name`] = file.fileName;
        payloadUpdate[`${key}_mime_type`] = file.mimeType;
        if (existing?.id) {
          const oldBucket = (existing as any)[`${key}_bucket`];
          const oldPath = (existing as any)[`${key}_path`];
          if (oldBucket && oldPath) replaced.push({ bucket: oldBucket, path: oldPath });
        }
      };

      addFile("strategy");
      addFile("curve");
      addFile("stats");

      if (isNew) {
        const strategyFile = fileByKey.get("strategy");
        const curveFile = fileByKey.get("curve");
        const statsFile = fileByKey.get("stats");
        if (!strategyFile || !curveFile || !statsFile) {
          return json({ ok: false, error: "MISSING_FILES" }, 400);
        }
        payloadUpdate.created_at = now;
        const insert = await admin
          .from("weekly_summaries")
          .insert({
            id: entryId,
            user_id: user.id,
            leader_id: user.leader_id,
            student_name: studentName,
            summary_text: summaryText,
            strategy_bucket: strategyFile.bucket,
            strategy_path: strategyFile.path,
            strategy_name: strategyFile.fileName,
            strategy_mime_type: strategyFile.mimeType,
            curve_bucket: curveFile.bucket,
            curve_path: curveFile.path,
            curve_name: curveFile.fileName,
            curve_mime_type: curveFile.mimeType,
            stats_bucket: statsFile.bucket,
            stats_path: statsFile.path,
            stats_name: statsFile.fileName,
            stats_mime_type: statsFile.mimeType,
            created_at: now,
            updated_at: now
          } as any)
          .select("id")
          .single();

        if (insert.error || !insert.data?.id) {
          if (normalizedFiles.length) {
            await removeStoredObjects(
              admin,
              normalizedFiles.map((file) => ({ bucket: file.bucket, path: file.path }))
            );
          }
          return json({ ok: false, error: "DB_ERROR" }, 500);
        }
      } else {
        const { error: upErr } = await admin.from("weekly_summaries").update(payloadUpdate).eq("id", entryId);
        if (upErr) {
          if (normalizedFiles.length) {
            await removeStoredObjects(
              admin,
              normalizedFiles.map((file) => ({ bucket: file.bucket, path: file.path }))
            );
          }
          return json({ ok: false, error: "DB_ERROR" }, 500);
        }
      }

      if (replaced.length) {
        await removeStoredObjects(admin, replaced);
      }

      await notifyLeadersAndAdmins(user, {
        title: "周总结提交 / Weekly summary submitted",
        content: buildStudentSubmitContent(user, isNew ? "提交了周总结�? : "更新了周总结�?, isNew ? "submitted a weekly summary." : "updated a weekly summary.")
      });

      return json({ ok: true, id: entryId });
    }

    const form = await req.formData().catch(() => null);
    if (!form) return json({ ok: false, error: "INVALID_FORM" }, 400);

    const summaryRaw = form.get("summaryText");
    const summaryText = typeof summaryRaw === "string" ? summaryRaw.trim() : "";
    if (!summaryText) return json({ ok: false, error: "MISSING_SUMMARY" }, 400);

    const entryIdRaw = form.get("entryId");
    const entryId = typeof entryIdRaw === "string" ? entryIdRaw.trim() : "";
    if (entryId && !isUuid(entryId)) return json({ ok: false, error: "INVALID_ENTRY" }, 400);

    const strategyFile = form.get("strategy");
    const curveFile = form.get("curve");
    const statsFile = form.get("stats");
    const strategy = strategyFile instanceof File ? strategyFile : null;
    const curve = curveFile instanceof File ? curveFile : null;
    const stats = statsFile instanceof File ? statsFile : null;

    if (!entryId && (!strategy || !curve || !stats)) {
      return json({ ok: false, error: "MISSING_FILES" }, 400);
    }

    for (const file of [strategy, curve, stats]) {
      if (!file) continue;
      if (!isAllowed(file, uploadMode)) return json({ ok: false, error: "INVALID_FILE_TYPE" }, 400);
      if (file.size > MAX_BYTES) return json({ ok: false, error: "FILE_TOO_LARGE" }, 400);
    }

    const bucketCandidates = [getR2Bucket()];

    const admin = supabaseAdmin();
    const now = new Date().toISOString();
    const uploaded: Array<{ bucket: string; path: string }> = [];
    let oldFiles: {
      strategy?: { bucket: string; path: string };
      curve?: { bucket: string; path: string };
      stats?: { bucket: string; path: string };
    } = {};

    if (entryId) {
      const { data: existing, error: existingErr } = await admin
        .from("weekly_summaries")
        .select(
          "id,user_id,strategy_bucket,strategy_path,curve_bucket,curve_path,stats_bucket,stats_path"
        )
        .eq("id", entryId)
        .maybeSingle();
      if (existingErr) return json({ ok: false, error: existingErr.message }, 500);
      if (!existing?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
      if (existing.user_id !== user.id) return json({ ok: false, error: "FORBIDDEN" }, 403);
      if (existing.strategy_bucket && existing.strategy_path) {
        oldFiles.strategy = { bucket: existing.strategy_bucket, path: existing.strategy_path };
      }
      if (existing.curve_bucket && existing.curve_path) {
        oldFiles.curve = { bucket: existing.curve_bucket, path: existing.curve_path };
      }
      if (existing.stats_bucket && existing.stats_path) {
        oldFiles.stats = { bucket: existing.stats_bucket, path: existing.stats_path };
      }
    }

    const uploads: {
      strategy?: Awaited<ReturnType<typeof uploadFile>>;
      curve?: Awaited<ReturnType<typeof uploadFile>>;
      stats?: Awaited<ReturnType<typeof uploadFile>>;
    } = {};

    try {
      if (strategy) {
        uploads.strategy = await uploadFile(admin, bucketCandidates, strategy, "strategy", user.id, defaultExt);
        uploaded.push({ bucket: uploads.strategy.bucket, path: uploads.strategy.path });
      }
      if (curve) {
        uploads.curve = await uploadFile(admin, bucketCandidates, curve, "curve", user.id, defaultExt);
        uploaded.push({ bucket: uploads.curve.bucket, path: uploads.curve.path });
      }
      if (stats) {
        uploads.stats = await uploadFile(admin, bucketCandidates, stats, "stats", user.id, defaultExt);
        uploaded.push({ bucket: uploads.stats.bucket, path: uploads.stats.path });
      }
    } catch {
      if (uploaded.length) {
        await removeStoredObjects(admin, uploaded);
      }
      return json({ ok: false, error: "UPLOAD_FAILED" }, 500);
    }

    if (entryId) {
      const payload: Record<string, unknown> = {
        student_name: studentName,
        summary_text: summaryText,
        leader_id: user.leader_id,
        reviewed_at: null,
        reviewed_by: null,
        review_note: null,
        updated_at: now
      };

      if (uploads.strategy) {
        payload.strategy_bucket = uploads.strategy.bucket;
        payload.strategy_path = uploads.strategy.path;
        payload.strategy_name = uploads.strategy.name;
        payload.strategy_mime_type = uploads.strategy.mime;
      }
      if (uploads.curve) {
        payload.curve_bucket = uploads.curve.bucket;
        payload.curve_path = uploads.curve.path;
        payload.curve_name = uploads.curve.name;
        payload.curve_mime_type = uploads.curve.mime;
      }
      if (uploads.stats) {
        payload.stats_bucket = uploads.stats.bucket;
        payload.stats_path = uploads.stats.path;
        payload.stats_name = uploads.stats.name;
        payload.stats_mime_type = uploads.stats.mime;
      }

      const { error: upErr } = await admin.from("weekly_summaries").update(payload).eq("id", entryId);
      if (upErr) {
        if (uploaded.length) {
          await removeStoredObjects(admin, uploaded);
        }
        return json({ ok: false, error: "DB_ERROR" }, 500);
      }

      const removals: Array<{ bucket: string; path: string }> = [];
      if (uploads.strategy && oldFiles.strategy) removals.push(oldFiles.strategy);
      if (uploads.curve && oldFiles.curve) removals.push(oldFiles.curve);
      if (uploads.stats && oldFiles.stats) removals.push(oldFiles.stats);
      if (removals.length) {
        await removeStoredObjects(admin, removals);
      }

      await notifyLeadersAndAdmins(user, {
        title: "周总结提交 / Weekly summary submitted",
        content: buildStudentSubmitContent(user, "已更新周总结�?, "updated a weekly summary.")
      });

      return json({ ok: true, id: entryId });
    }

    if (!uploads.strategy || !uploads.curve || !uploads.stats) {
      return json({ ok: false, error: "MISSING_FILES" }, 400);
    }

    const { data: row, error: insertErr } = await admin
      .from("weekly_summaries")
      .insert({
        user_id: user.id,
        leader_id: user.leader_id,
        student_name: studentName,
        summary_text: summaryText,
        strategy_bucket: uploads.strategy.bucket,
        strategy_path: uploads.strategy.path,
        strategy_name: uploads.strategy.name,
        strategy_mime_type: uploads.strategy.mime,
        curve_bucket: uploads.curve.bucket,
        curve_path: uploads.curve.path,
        curve_name: uploads.curve.name,
        curve_mime_type: uploads.curve.mime,
        stats_bucket: uploads.stats.bucket,
        stats_path: uploads.stats.path,
        stats_name: uploads.stats.name,
        stats_mime_type: uploads.stats.mime,
        created_at: now,
        updated_at: now
      } as any)
      .select("id")
      .single();

    if (insertErr || !row?.id) {
      if (uploaded.length) {
        await removeStoredObjects(admin, uploaded);
      }
      return json({ ok: false, error: "DB_ERROR" }, 500);
    }

    await notifyLeadersAndAdmins(user, {
      title: "周总结提交 / Weekly summary submitted",
      content: buildStudentSubmitContent(user, "提交了周总结�?, "submitted a weekly summary.")
    });

    return json({ ok: true, id: row.id });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
