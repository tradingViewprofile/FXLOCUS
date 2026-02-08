import { NextResponse } from "next/server";

import { canConsultWith } from "@/lib/system/consult";
import { requireSystemUser } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSystemUser();
    const body = await req.json().catch(() => ({}));
    const peerId = String(body?.peerId || "").trim();
    if (!peerId || !isUuid(peerId)) return json({ ok: false, error: "INVALID_PEER" }, 400);

    const allowed = await canConsultWith(ctx, peerId);
    if (!allowed) return json({ ok: false, error: "FORBIDDEN" }, 403);

    const admin = supabaseAdmin();
    const { error } = await admin
      .from("consult_messages")
      .update({ read_at: null })
      .eq("to_user_id", ctx.user.id)
      .eq("from_user_id", peerId);

    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
