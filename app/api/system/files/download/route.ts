import { NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";
import { getIpFromHeaders, getUserAgent } from "@/lib/system/requestMeta";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user } = await requireSystemUser();
    const body = await req.json().catch(() => null);
    const fileId = String(body?.fileId || "");

    if (!fileId) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const admin = supabaseAdmin();
    const f = await admin.from("files").select("id,storage_bucket,storage_path").eq("id", fileId).maybeSingle();
    if (f.error) return json({ ok: false, error: f.error.message }, 500);
    if (!f.data?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);

    let allowed = user.role === "super_admin";
    if (!allowed) {
      const seg = String(f.data.storage_path || "").split("/")[0];
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

    if (!allowed) return json({ ok: false, error: "FORBIDDEN" }, 403);

    const signedUrl = await createSignedDownloadUrl(
      admin,
      f.data.storage_bucket,
      f.data.storage_path,
      3600
    );
    if (!signedUrl) return json({ ok: false, error: "SIGN_FAILED" }, 500);

    const ip = getIpFromHeaders(req.headers);
    const ua = getUserAgent(req.headers);
    await admin.from("file_download_logs").insert({
      file_id: fileId,
      user_id: user.id,
      ip,
      user_agent: ua
    });

    return json({ ok: true, url: signedUrl });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
