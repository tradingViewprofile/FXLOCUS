import { NextResponse } from "next/server";

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
    const messageId = String(body?.messageId || "").trim();
    if (!messageId || !isUuid(messageId)) return json({ ok: false, error: "INVALID_MESSAGE" }, 400);

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("consult_messages")
      .select("id,from_user_id,created_at")
      .eq("id", messageId)
      .maybeSingle();

    if (error) return json({ ok: false, error: error.message }, 500);
    if (!data) return json({ ok: false, error: "NOT_FOUND" }, 404);
    if (data.from_user_id !== ctx.user.id) return json({ ok: false, error: "FORBIDDEN" }, 403);

    const createdAt = new Date(String(data.created_at || ""));
    const diffMs = Date.now() - createdAt.getTime();
    if (!Number.isFinite(diffMs) || diffMs > 5 * 60 * 1000) {
      return json({ ok: false, error: "RECALL_EXPIRED" }, 400);
    }

    const { error: delError } = await admin.from("consult_messages").delete().eq("id", messageId);
    if (delError) return json({ ok: false, error: delError.message }, 500);
    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
