import { NextRequest, NextResponse } from "next/server";

import { getSystemAuth } from "@/lib/system/auth";
import { isAdminRole } from "@/lib/system/roles";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { getR2Bucket, r2Enabled } from "@/lib/storage/r2";
import { removeStoredObjects, uploadBufferToStorage } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function safeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "ladder";
}

export async function POST(req: NextRequest) {
  const auth = await getSystemAuth();
  if (!auth.ok) return noStoreJson({ ok: false, error: auth.reason }, 401);
  if (!isAdminRole(auth.user.role)) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);

  const form = await req.formData().catch(() => null);
  if (!form) return noStoreJson({ ok: false, error: "INVALID_FORM" }, 400);

  const file = form.get("file");
  if (!(file instanceof File)) return noStoreJson({ ok: false, error: "MISSING_FILE" }, 400);

  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  const bucket = r2Enabled() ? getR2Bucket() : "fxlocus_ladder";
  const filename = safeFilename(file.name || "ladder.png");
  const path = `${now.slice(0, 10)}/${Date.now()}-${Math.random().toString(16).slice(2)}-${filename}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    await uploadBufferToStorage(admin, bucket, path, bytes, file.type || "image/png");
  } catch {
    return noStoreJson({ ok: false, error: "UPLOAD_FAILED" }, 500);
  }

  const { data: row, error: dbErr } = await admin
    .from("ladder_snapshots")
    .insert({
      storage_bucket: bucket,
      storage_path: path,
      created_by: auth.user.id,
      captured_at: now
    })
    .select("id")
    .single();

  if (dbErr || !row?.id) {
    await removeStoredObjects(admin, [{ bucket, path }]);
    return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);
  }
  return noStoreJson({ ok: true, id: row.id });
}
