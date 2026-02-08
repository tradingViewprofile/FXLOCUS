import { NextResponse } from "next/server";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchCoachAssignedUserIds } from "@/lib/system/coachAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { fetchStudentSupportNames } from "@/lib/system/studentSupport";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const { user, supabase } = await requireManager();
    const admin = supabaseAdmin();
    const db = user.role === "coach" || user.role === "assistant" ? admin : supabase;
    const learnerRoles = ["student", "trader", "coach"];

    const q = await db
      .from("course_access")
      .select("id,user_id,course_id,status,requested_at")
      .eq("status", "requested")
      .order("requested_at", { ascending: false })
      .limit(300);

    if (q.error) return json({ ok: false, error: q.error.message }, 500);

    const rows = q.data || [];
    const userIds = Array.from(
      new Set<string>(rows.map((r: any) => String(r.user_id || "")).filter(Boolean))
    );

    let scopedUserIds = userIds;
    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      const treeSet = new Set<string>((treeIds || []).map(String).filter(Boolean));
      scopedUserIds = userIds.filter((id: string) => treeSet.has(id));
      if (!scopedUserIds.length) return json({ ok: true, items: [] });
    } else if (user.role === "coach") {
      const assignedIds = await fetchCoachAssignedUserIds(supabase, user.id);
      const assignedSet = new Set<string>((assignedIds || []).map(String).filter(Boolean));
      scopedUserIds = userIds.filter((id: string) => assignedSet.has(id));
      if (!scopedUserIds.length) return json({ ok: true, items: [] });
    } else if (user.role === "assistant") {
      const createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
      const createdSet = new Set<string>((createdIds || []).map(String).filter(Boolean));
      scopedUserIds = userIds.filter((id: string) => createdSet.has(id));
      if (!scopedUserIds.length) return json({ ok: true, items: [] });
    }

    let usersQuery = db
      .from("profiles")
      .select("id,full_name,email,phone,role,leader_id")
      .in("id", scopedUserIds)
      .in("role", learnerRoles);
    const usersRes = userIds.length ? await usersQuery : ({ data: [], error: null } as any);

    if (usersRes.error) return json({ ok: false, error: usersRes.error.message }, 500);

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  support_name?: string | null;
  assistant_name?: string | null;
  coach_name?: string | null;
};
    const users = (usersRes.data || []) as ProfileRow[];
    const usersById = new Map<string, ProfileRow>(users.map((u) => [u.id, u]));
    const filteredRows = rows.filter((r: any) => usersById.has(String(r.user_id)));
    const courseIds = Array.from(new Set(filteredRows.map((r: any) => Number(r.course_id)).filter(Boolean)));

    const coursesRes = courseIds.length
      ? await db.from("courses").select("id,title_zh,title_en").in("id", courseIds)
      : ({ data: [], error: null } as any);

    if (coursesRes.error) return json({ ok: false, error: coursesRes.error.message }, 500);

    const coursesById = new Map((coursesRes.data || []).map((c: any) => [c.id, c]));
    const supportMap = await fetchStudentSupportNames(admin, scopedUserIds);

    const items = filteredRows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      course_id: r.course_id,
      status: r.status,
      requested_at: r.requested_at,
      user: (() => {
        const base = usersById.get(r.user_id);
        if (!base) return null;
        const support = supportMap.get(String(r.user_id));
        return {
          ...base,
          support_name: support?.displayName || null,
          assistant_name: support?.assistantName || null,
          coach_name: support?.coachName || null
        };
      })(),
      course: coursesById.get(r.course_id) || null
    }));

    return json({ ok: true, items });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
