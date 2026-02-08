import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/system/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const { supabase } = await requireSuperAdmin();

    const { data, error } = await supabase
      .from("role_audit_logs")
      .select(
        "id,created_at,from_role,to_role,reason,target_id,actor_id,target:profiles!role_audit_logs_target_id_fkey(full_name,email),actor:profiles!role_audit_logs_actor_id_fkey(full_name,email)"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, items: data || [] });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}

