import { NextRequest, NextResponse } from "next/server";

import { requireManager } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

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
    const ctx = await requireManager();
    if (ctx.user.role === "coach") {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }
    const learnerRoles = ["student", "trader", "coach", "assistant", "leader"];
    const admin = supabaseAdmin();
    const db = ctx.user.role === "assistant" ? admin : ctx.supabase;
    const page = 1;
    const pageSize = 1000;

    let query = db
      .from("profiles")
      .select(
        "id,full_name,email,phone,role,status,created_at,last_login_at,student_status,leader_id,source,created_by",
        { count: "exact" }
      )
      .in("role", learnerRoles)
      .order("created_at", { ascending: false })
      .limit(pageSize);

    if (ctx.user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(ctx.supabase, ctx.user.id);
      if (!treeIds.length) return json({ ok: true, items: [], page, pageSize, total: 0 });
      query = query.in("id", treeIds);
    } else if (ctx.user.role === "assistant") {
      query = query.eq("created_by", ctx.user.id);
    }

    const { data: users, error, count } = await query;

    if (error) return json({ ok: false, error: "DB_ERROR" }, 500);

    const userIds = (users || []).map((u: any) => u.id);
    const leaderIds = Array.from(
      new Set((users || []).map((u: any) => u.leader_id).filter(Boolean))
    ) as string[];
    const createdByIds = Array.from(
      new Set((users || []).map((u: any) => u.created_by).filter(Boolean))
    ) as string[];

    const { data: leaders, error: leaderErr } = leaderIds.length
      ? await db.from("profiles").select("id,full_name,email").in("id", leaderIds)
      : ({ data: [], error: null } as any);

    if (leaderErr) return json({ ok: false, error: "DB_ERROR" }, 500);
    const { data: creators, error: creatorErr } = createdByIds.length
      ? await db.from("profiles").select("id,full_name,email,role,status").in("id", createdByIds)
      : ({ data: [], error: null } as any);
    if (creatorErr) return json({ ok: false, error: "DB_ERROR" }, 500);
    const { data: access } = userIds.length
      ? await db
          .from("course_access")
          .select("user_id,status")
          .in("user_id", userIds)
      : { data: [] as any[] };

    const { data: coachAssignments, error: coachErr } = userIds.length
      ? await db
          .from("coach_assignments")
          .select("assigned_user_id,coach_id,coach:profiles!coach_assignments_coach_id_fkey(id,full_name,email)")
          .in("assigned_user_id", userIds)
      : ({ data: [], error: null } as any);

    if (coachErr) return json({ ok: false, error: "DB_ERROR" }, 500);

    const statsByUser = new Map<
      string,
      { requested: number; approved: number; completed: number; rejected: number }
    >();
    (access || []).forEach((row: any) => {
      const s = statsByUser.get(row.user_id) || {
        requested: 0,
        approved: 0,
        completed: 0,
        rejected: 0
      };
      if (row.status === "requested") s.requested += 1;
      if (row.status === "approved") s.approved += 1;
      if (row.status === "completed") s.completed += 1;
      if (row.status === "rejected") s.rejected += 1;
      statsByUser.set(row.user_id, s);
    });

    const leadersById = new Map((leaders || []).map((l: any) => [l.id, l]));
    const creatorsById = new Map((creators || []).map((c: any) => [c.id, c]));
    const coachByUserId = new Map<
      string,
      { coach_id: string | null; coach: any | null }
    >(
      (coachAssignments || []).map((row: any) => [
        row.assigned_user_id,
        { coach_id: row.coach_id || null, coach: row.coach || null }
      ])
    );

    const items = (users || []).map((u: any) => ({
      ...u,
      full_name: u.full_name || "",
      leader: u.leader_id ? leadersById.get(u.leader_id) || null : null,
      assistant: u.created_by ? creatorsById.get(u.created_by) || null : null,
      coach: coachByUserId.get(u.id)?.coach || null,
      coach_id: coachByUserId.get(u.id)?.coach_id || null,
      stats: statsByUser.get(u.id) || { requested: 0, approved: 0, completed: 0, rejected: 0 }
    }));

    return json({ ok: true, items, page, pageSize, total: count ?? items.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
