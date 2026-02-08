import { NextRequest, NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  if (!id) return noStoreJson({ ok: false, error: "INVALID_ID" }, 400);

  try {
    const { user } = await requireSystemUser();
    const admin = supabaseAdmin();
    const { data: row, error: rowErr } = await admin
      .from("notifications")
      .select("id,to_user_id,from_user_id,title,content,created_at")
      .eq("id", id)
      .maybeSingle();
    if (rowErr) return noStoreJson({ ok: false, error: rowErr.message }, 500);
    if (!row?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);
    if (row.to_user_id !== user.id) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);

    const now = new Date().toISOString();
    let query = admin
      .from("notifications")
      .update({ read_at: now } as any)
      .eq("title", row.title)
      .eq("content", row.content)
      .eq("created_at", row.created_at);
    query = row.from_user_id ? query.eq("from_user_id", row.from_user_id) : query.is("from_user_id", null);
    const { error: updateErr } = await query;
    if (updateErr) return noStoreJson({ ok: false, error: updateErr.message }, 500);
    return noStoreJson({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }
}
