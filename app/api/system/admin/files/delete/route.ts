import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { removeStoredObjects } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  fileId: z.string().uuid()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const admin = supabaseAdmin();
    const { data: file, error: fileErr } = await admin
      .from("files")
      .select("id,storage_bucket,storage_path")
      .eq("id", parsed.data.fileId)
      .maybeSingle();

    if (fileErr) return json({ ok: false, error: fileErr.message }, 500);
    if (!file?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);

    await removeStoredObjects(admin, [{ bucket: file.storage_bucket, path: file.storage_path }]);

    const del = await admin.from("files").delete().eq("id", file.id);
    if (del.error) return json({ ok: false, error: del.error.message }, 500);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
