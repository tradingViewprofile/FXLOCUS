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
      .from("profiles")
      .select(
        "id,full_name,email,phone,leader_id,student_status,created_at,last_login_at"
      )
      .in("student_status", ["捐赠学员", "考核通过+捐赠学员"])
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return json({ ok: false, error: error.message }, 500);

    type StudentRow = {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      leader_id: string | null;
      student_status: string | null;
      created_at: string | null;
      last_login_at: string | null;
    };
    const rows = (Array.isArray(data) ? data : []) as StudentRow[];
    const leaderIds = Array.from(
      new Set(
        rows
          .map((row: StudentRow) => row.leader_id)
          .filter((id: string | null): id is string => Boolean(id))
      )
    );

    let leadersById = new Map<string, { id: string; full_name: string | null; email: string | null }>();
    if (leaderIds.length) {
      const { data: leaders } = await supabase.from("profiles").select("id,full_name,email").in("id", leaderIds);
      type LeaderRow = { id: string; full_name: string | null; email: string | null };
      const leaderRows = (Array.isArray(leaders) ? leaders : []) as LeaderRow[];
      leadersById = new Map(leaderRows.map((leader: LeaderRow) => [leader.id, leader]));
    }

    const items = rows.map((row: StudentRow) => ({
      ...row,
      leader: row.leader_id ? leadersById.get(row.leader_id) || null : null
    }));

    return json({ ok: true, items });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
