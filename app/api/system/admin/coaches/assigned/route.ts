import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Params = z.object({
  coachId: z.string().uuid()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireAdmin();
    const raw = { coachId: req.nextUrl.searchParams.get("coachId") || "" };
    const parsed = Params.safeParse(raw);
    if (!parsed.success) return json({ ok: false, error: "INVALID_COACH" }, 400);

    const coachId = parsed.data.coachId;
    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.includes(coachId)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const { data: assignments, error: assignErr } = await supabase
      .from("coach_assignments")
      .select("assigned_user_id")
      .eq("coach_id", coachId);
    if (assignErr) return json({ ok: false, error: assignErr.message }, 500);

    const assignedIds = (assignments || [])
      .map((row: { assigned_user_id: string | null }) => row.assigned_user_id)
      .filter((id: string | null): id is string => Boolean(id));
    if (!assignedIds.length) return json({ ok: true, items: [] });

    let query = supabase
      .from("profiles")
      .select("id,full_name,email,phone,role,student_status,status,leader_id")
      .in("id", assignedIds)
      .order("created_at", { ascending: false })
      .limit(500);

    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.length) return json({ ok: true, items: [] });
      query = query.in("id", treeIds);
    }

    const { data: users, error } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);

    return json({ ok: true, items: users || [] });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
