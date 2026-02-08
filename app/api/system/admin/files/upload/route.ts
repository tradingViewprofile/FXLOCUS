export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireAdmin } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { getR2Bucket, r2Enabled } from "@/lib/storage/r2";
import { removeStoredObjects, uploadBufferToStorage } from "@/lib/storage/storage";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/json",
  "image/png",
  "image/jpeg"
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "json", "png", "jpg", "jpeg"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function fileTypeFrom(file: File) {
  const name = String(file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";
  if (ext === "pdf") return "pdf";
  if (ext === "json") return "json";
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return "image";

  const mime = String(file.type || "").toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("json")) return "json";
  if (mime.includes("image")) return "image";
  return null;
}

function safeSegment(input: string) {
  const s = (input || "").trim().toLowerCase();
  const cleaned = s.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "misc";
}

function safeFileName(name: string) {
  const base = (name || "").trim();
  const idx = base.lastIndexOf(".");
  const ext = idx >= 0 ? base.slice(idx).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  const stem = idx >= 0 ? base.slice(0, idx) : base;

  const safeStem = stem
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return (safeStem || "file") + (ext || "");
}

export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin();
    const admin = supabaseAdmin();

    if (!r2Enabled()) {
      return NextResponse.json({ ok: false, error: "R2_NOT_CONFIGURED" }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const category = String(form.get("category") || "misc");
    const displayName = String(form.get("name") || "");
    const description = String(form.get("description") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "MISSING_FILE" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    const ext = String(file.name || "")
      .toLowerCase()
      .split(".")
      .pop();
    const mime = String(file.type || "").toLowerCase();
    if ((!ext || !ALLOWED_EXTENSIONS.has(ext)) && !ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json({ ok: false, error: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    const bucketCandidates = [getR2Bucket()];

    const folder = safeSegment(String(form.get("folder") || category));
    const originalName = String(file.name || "").trim();
    const safeName = safeFileName(originalName || "upload.bin");
    const finalName = displayName.trim() ? displayName.trim() : originalName || safeName;
    const path = `${folder}/${Date.now()}-${randomUUID()}-${safeName}`;
    if (path.startsWith("/") || path.includes("..") || path.includes("//")) {
      return NextResponse.json({ ok: false, error: "INVALID_KEY" }, { status: 400 });
    }

    const buf = await file.arrayBuffer();

    let bucketUsed = bucketCandidates[0] || "fxlocus-assets";
    let uploadError: Error | null = null;

    for (const candidate of bucketCandidates.length ? bucketCandidates : [bucketUsed]) {
      try {
        await uploadBufferToStorage(admin, candidate, path, buf, file.type || "application/octet-stream");
        bucketUsed = candidate;
        uploadError = null;
        break;
      } catch (err: any) {
        uploadError = err instanceof Error ? err : new Error(String(err || "UPLOAD_FAILED"));
        if (!/bucket/i.test(uploadError.message)) break;
      }
    }

    if (uploadError) {
      console.error("[files/upload] storage upload error:", uploadError);
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
    }

    const ins = await admin
      .from("files")
      .insert({
        category: folder,
        name: finalName,
        description: description.trim() || null,
        storage_bucket: bucketUsed,
        storage_path: path,
        size_bytes: file.size,
        mime_type: file.type || null,
        file_type: fileTypeFrom(file),
        uploaded_by: user.id
      })
      .select("*")
      .single();

    if (ins.error) {
      console.error("[files/upload] db insert error:", ins.error);
      await removeStoredObjects(admin, [{ bucket: bucketUsed, path }]);
      return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, file: ins.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[files/upload] fatal:", e);
    return NextResponse.json({ ok: false, error: e?.message || "UPLOAD_FAILED" }, { status: 500 });
  }
}
