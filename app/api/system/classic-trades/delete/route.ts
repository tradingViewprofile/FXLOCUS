import { NextResponse } from "next/server";
import { z } from "zod";

import { requireLearner } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { removeStoredObjects } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  entryId: z.string().uuid()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user } = await requireLearner();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const admin = supabaseAdmin();
    const { data: row, error } = await admin
      .from("classic_trades")
      .select("id,user_id,image_bucket,image_path")
      .eq("id", parsed.data.entryId)
      .maybeSingle();
    if (error) return json({ ok: false, error: error.message }, 500);
    if (!row?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    if (row.user_id !== user.id) return json({ ok: false, error: "FORBIDDEN" }, 403);

    const del = await admin.from("classic_trades").delete().eq("id", row.id);
    if (del.error) return json({ ok: false, error: "DB_ERROR" }, 500);

    if (row.image_bucket && row.image_path) {
      await removeStoredObjects(admin, [{ bucket: row.image_bucket, path: row.image_path }]);
    }

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
