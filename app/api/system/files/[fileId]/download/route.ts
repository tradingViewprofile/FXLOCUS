import { NextRequest, NextResponse } from "next/server";

import { getIpFromHeaders, getUserAgent } from "@/lib/system/requestMeta";
import { requireSystemUser } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest, ctx: { params: { fileId: string } }) {
  const fileId = ctx.params.fileId;
  if (!fileId) return noStoreJson({ ok: false, error: "INVALID_FILE" }, 400);

  try {
    const { user } = await requireSystemUser();
    const admin = supabaseAdmin();

    const { data: file, error: fileErr } = await admin
      .from("files")
      .select("id,storage_bucket,storage_path")
      .eq("id", fileId)
      .maybeSingle();

    if (fileErr) return noStoreJson({ ok: false, error: fileErr.message }, 500);
    if (!file?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);

    let allowed = user.role === "super_admin";
    if (!allowed) {
      const seg = String(file.storage_path || "").split("/")[0];
      if (seg && seg === user.id) {
        allowed = true;
      } else {
        const perm = await admin
          .from("file_permissions")
          .select("file_id")
          .eq("file_id", fileId)
          .eq("grantee_profile_id", user.id)
          .maybeSingle();
        allowed = Boolean(perm.data?.file_id);
      }
    }

    if (!allowed) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);

    const signedUrl = await createSignedDownloadUrl(admin, file.storage_bucket, file.storage_path, 3600);
    if (!signedUrl) return noStoreJson({ ok: false, error: "SIGN_FAILED" }, 500);

    const ip = getIpFromHeaders(req.headers);
    const ua = getUserAgent(req.headers);
    await admin.from("file_download_logs").insert({
      file_id: fileId,
      user_id: user.id,
      ip,
      user_agent: ua
    } as any);

    return noStoreJson({ ok: true, url: signedUrl });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }
}
