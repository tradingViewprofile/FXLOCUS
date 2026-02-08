import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["student", "trader", "coach", "leader"] as const;

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const { user, supabase } = await requireAdmin();
    const admin = supabaseAdmin();

    let targetIds: string[] | null = null;
    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      targetIds = treeIds.filter((id) => id !== user.id);
      if (!targetIds.length) return json({ ok: true, items: [] });
    }

    let query = admin
      .from("profiles")
      .select("id,full_name,email,role")
      .in("role", ALLOWED_ROLES)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (targetIds) {
      query = query.in("id", targetIds);
    }

    const { data, error } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);

    const items = (data || []).map((row: any) => ({
      id: String(row.id),
      full_name: row.full_name ?? null,
      email: row.email ?? null,
      role: row.role ?? null
    }));

    return json({ ok: true, items });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
