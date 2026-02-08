import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_req: NextRequest, ctx: { params: { assistantId: string } }) {
  try {
    const { user } = await requireAdmin();
    const admin = supabaseAdmin();

    const assistantId = String(ctx.params.assistantId || "").trim();
    if (!assistantId) return json({ ok: false, error: "INVALID_ASSISTANT" }, 400);

    const { data: assistant, error: assistantErr } = await admin
      .from("profiles")
      .select("id,role,leader_id")
      .eq("id", assistantId)
      .maybeSingle();
    if (assistantErr) return json({ ok: false, error: assistantErr.message }, 500);
    if (!assistant?.id || assistant.role !== "assistant") {
      return json({ ok: false, error: "NOT_FOUND" }, 404);
    }
    if (user.role === "leader" && assistant.leader_id !== user.id) {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const { data, error } = await admin
      .from("profiles")
      .select("id,full_name,email,phone,role,status,student_status,last_login_at,created_at")
      .eq("created_by", assistantId)
      .in("role", ["student", "trader", "coach"])
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, items: data || [] });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
