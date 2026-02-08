import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireLearner } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { getR2Bucket, r2Enabled, r2PublicUrl } from "@/lib/storage/r2";
import { createSignedDownloadUrl, uploadBufferToStorage } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXT = new Set(["png", "jpg", "jpeg"]);
const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);
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
  return ALLOWED_EXT.has(ext) || ALLOWED_MIME.has(mime);
}

export async function POST(req: NextRequest, ctx: { params: { courseId: string } }) {
  try {
    const { user, supabase } = await requireLearner();
    if (!r2Enabled()) return json({ ok: false, error: "R2_NOT_CONFIGURED" }, 500);
    const courseId = Number(ctx.params.courseId);
    if (!Number.isInteger(courseId) || courseId < 1 || courseId > 21) {
      return json({ ok: false, error: "INVALID_COURSE" }, 400);
    }

    const { data: access } = await supabase
      .from("course_access")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (!access) return json({ ok: false, error: "NO_ACCESS" }, 403);
    if (access.status !== "approved" && access.status !== "completed") {
      return json({ ok: false, error: "NOT_APPROVED" }, 403);
    }

    const form = await req.formData().catch(() => null);
    if (!form) return json({ ok: false, error: "INVALID_FORM" }, 400);
    const file = form.get("file");
    if (!(file instanceof File)) return json({ ok: false, error: "MISSING_FILE" }, 400);
    if (!isAllowed(file)) return json({ ok: false, error: "INVALID_FILE_TYPE" }, 400);
    if (file.size > MAX_BYTES) return json({ ok: false, error: "FILE_TOO_LARGE" }, 400);

    const bucketCandidates = [getR2Bucket()];
    const bucket = bucketCandidates[0] || "fxlocus-assets";
    const now = new Date();
    const safeName = safeFilename(file.name || "image.png");
    const path = `course-summaries/${user.id}/${courseId}/${now.toISOString().slice(0, 10)}/${Date.now()}-${randomUUID()}-${safeName}`;
    const bytes = await file.arrayBuffer();
    const admin = supabaseAdmin();

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

    const url = r2PublicUrl(path) || (await createSignedDownloadUrl(admin, bucketUsed, path, 3600));
    if (!url) return json({ ok: false, error: "URL_FAILED" }, 500);

    return json({ ok: true, url, bucket: bucketUsed, path });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
