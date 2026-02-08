import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { getPagination } from "@/lib/system/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const admin = supabaseAdmin();
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 50, maxPageSize: 200 });

    let query = admin
      .from("profiles")
      .select("id,full_name,email,phone,leader_id,status,created_at,last_login_at,created_by", { count: "exact" })
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (user.role === "leader") {
      query = query.eq("leader_id", user.id);
    }

    const { data, error, count } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);

    const leaderIds = Array.from(new Set((data || []).map((row: any) => row.leader_id).filter(Boolean))) as string[];
    const { data: leaders, error: leaderErr } = leaderIds.length
      ? await admin.from("profiles").select("id,full_name,email").in("id", leaderIds)
      : ({ data: [], error: null } as any);
    if (leaderErr) return json({ ok: false, error: leaderErr.message }, 500);

    const leaderById = new Map((leaders || []).map((row: any) => [row.id, row]));
    const items = (data || []).map((row: any) => ({
      ...row,
      leader: row.leader_id ? leaderById.get(row.leader_id) || null : null
    }));

    return json({ ok: true, items, page, pageSize, total: count ?? items.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
