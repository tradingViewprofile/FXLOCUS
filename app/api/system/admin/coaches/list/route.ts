import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
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
    const { user, supabase } = await requireAdmin();
    const isSuper = user.role === "super_admin";
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 50, maxPageSize: 200 });

    let query = supabase
      .from("profiles")
      .select("id,full_name,email,phone,leader_id,created_at,last_login_at,status", { count: "exact" })
      .eq("role", "coach")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.length) return json({ ok: true, items: [], page, pageSize, total: 0 });
      query = query.in("id", treeIds);
    }

    const { data, error, count } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);

    const coachIds = (data || [])
      .map((row: { id: string | null }) => row.id)
      .filter((id: string | null): id is string => Boolean(id));
    const { data: assignments, error: assignErr } = coachIds.length
      ? await supabase
          .from("coach_assignments")
          .select(isSuper ? "coach_id,assigned_user_id" : "coach_id")
          .in("coach_id", coachIds)
      : ({ data: [], error: null } as any);
    if (assignErr) return json({ ok: false, error: "DB_ERROR" }, 500);

    const counts = new Map<string, number>();
    (assignments || []).forEach((row: any) => {
      const id = String(row.coach_id || "");
      if (!id) return;
      counts.set(id, (counts.get(id) || 0) + 1);
    });

    const managedLeadersByCoach = new Map<string, Set<string>>();
    if (isSuper && Array.isArray(assignments) && assignments.length) {
      const assignedUserIds = Array.from(
        new Set((assignments || []).map((row: any) => row.assigned_user_id).filter(Boolean))
      );
      const { data: assignedUsers } = assignedUserIds.length
        ? await supabase.from("profiles").select("id,leader_id").in("id", assignedUserIds)
        : ({ data: [], error: null } as any);
      const leaderByUserId = new Map<string, string | null>(
        (assignedUsers || []).map((row: any) => [
          String(row.id),
          row.leader_id ? String(row.leader_id) : null
        ])
      );
      (assignments || []).forEach((row: any) => {
        const coachId = String(row.coach_id || "");
        const assignedId = String(row.assigned_user_id || "");
        if (!coachId || !assignedId) return;
        const leaderId = leaderByUserId.get(assignedId);
        if (typeof leaderId !== "string" || !leaderId) return;
        const set = managedLeadersByCoach.get(coachId) || new Set<string>();
        set.add(leaderId);
        managedLeadersByCoach.set(coachId, set);
      });
    }

    const leaderIds = Array.from(
      new Set((data || []).map((row: any) => row.leader_id).filter(Boolean))
    ) as string[];
    const { data: leaders, error: leaderErr } = leaderIds.length
      ? await supabase.from("profiles").select("id,full_name,email").in("id", leaderIds)
      : ({ data: [], error: null } as any);
    if (leaderErr) return json({ ok: false, error: "DB_ERROR" }, 500);
    const leadersById = new Map((leaders || []).map((row: any) => [row.id, row]));

    const items = (data || []).map((row: any) => ({
      ...row,
      leader: row.leader_id ? leadersById.get(row.leader_id) || null : null,
      assigned_count: counts.get(row.id) || 0,
      managed_leader_ids: isSuper ? Array.from(managedLeadersByCoach.get(row.id) || []) : undefined
    }));

    return json({ ok: true, items, page, pageSize, total: count ?? items.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
