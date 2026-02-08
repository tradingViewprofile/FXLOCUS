import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchCoachAssignedUserIds } from "@/lib/system/coachAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { isSuperAdmin } from "@/lib/system/roles";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

const LeaderIdParam = z.string().uuid();

const COURSE_STATUSES = ["requested", "approved", "rejected", "completed"] as const;
const LEARNER_ROLES = ["student", "trader", "coach"] as const;
const DEFAULT_STUDENT_STATUS = "普通学�?;

function emptyOverview(role: "coach" | "assistant") {
  return {
    ok: true,
    role,
    scope: { leaderId: null },
    students: { total: 0, frozen: 0, byStatus: {} },
    leaders: { total: 0 },
    traders: { total: 0 },
    coaches: { total: 0 },
    assistants: { total: 0 },
    leaderTeams: [],
    courses: { requested: 0, approved: 0, rejected: 0, completed: 0 },
    pending: { courseAccessRequests: 0, fileAccessRequests: 0 },
    records: { donate: 0, contact: 0, enrollment: 0, subscribe: 0 },
    downloads: { total: 0 },
    ladder: { requested: 0, approved: 0, rejected: 0 },
    generatedAt: new Date().toISOString()
  };
}

type LeaderTeamRow = {
  leader_id: string;
  leader_name: string;
  leader_email: string;
  students: number;
  traders: number;
  leaders: number;
};

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireManager();
    const admin = supabaseAdmin();
    const db = user.role === "coach" || user.role === "assistant" ? admin : supabase;

    if (user.role === "coach") {
      const assignedIds = await fetchCoachAssignedUserIds(supabase, user.id);
      if (!assignedIds.length) {
        return json(emptyOverview("coach"));
      }

      const { data: profileRows, error: profileErr } = await db
        .from("profiles")
        .select("id,role,student_status,status")
        .in("id", assignedIds);
      if (profileErr) return json({ ok: false, error: profileErr.message }, 500);

      const byStudentStatus: Record<string, number> = {};
      let studentsTotal = 0;
      let studentsFrozen = 0;
      let tradersTotal = 0;

      (profileRows || []).forEach((row: any) => {
        const role = String(row.role || "");
        if (role !== "student" && role !== "trader") return;
        const key = String(row.student_status || DEFAULT_STUDENT_STATUS);
        byStudentStatus[key] = Number(byStudentStatus[key] || 0) + 1;
        studentsTotal += 1;
        if (row.status === "frozen") studentsFrozen += 1;
        if (role === "trader") tradersTotal += 1;
      });

      const { data: courseRows, error: courseErr } = await db
        .from("course_access")
        .select("user_id,status")
        .in("user_id", assignedIds);
      if (courseErr) return json({ ok: false, error: courseErr.message }, 500);

      const courses: Record<(typeof COURSE_STATUSES)[number], number> = {
        requested: 0,
        approved: 0,
        rejected: 0,
        completed: 0
      };

      (courseRows || []).forEach((row: any) => {
        const status = String(row.status || "");
        if ((COURSE_STATUSES as readonly string[]).includes(status)) {
          (courses as any)[status] = Number((courses as any)[status] || 0) + 1;
        }
      });

      const { count: fileCount, error: fileErr } = await db
        .from("file_access_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "requested")
        .in("user_id", assignedIds);
      if (fileErr) return json({ ok: false, error: fileErr.message }, 500);

      return json({
        ok: true,
        role: "coach",
        scope: { leaderId: null },
        students: { total: studentsTotal, frozen: studentsFrozen, byStatus: byStudentStatus },
        leaders: { total: 0 },
        traders: { total: tradersTotal },
        coaches: { total: 0 },
        assistants: { total: 0 },
        leaderTeams: [],
        courses,
        pending: { courseAccessRequests: courses.requested, fileAccessRequests: Number(fileCount || 0) },
        records: { donate: 0, contact: 0, enrollment: 0, subscribe: 0 },
        downloads: { total: 0 },
        ladder: { requested: 0, approved: 0, rejected: 0 },
        generatedAt: new Date().toISOString()
      });
    }

    if (user.role === "assistant") {
      let createdIds: string[] = [];
      try {
        createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
      } catch (err: any) {
        const message = String(err?.message || "");
        const warning = message.includes("created_by")
          ? "profiles_created_by_missing"
          : message || "ASSISTANT_SCOPE_FAILED";
        return json({ ...emptyOverview("assistant"), warning });
      }
      if (!createdIds.length) {
        return json(emptyOverview("assistant"));
      }

      const { data: profileRows, error: profileErr } = await db
        .from("profiles")
        .select("id,role,student_status,status")
        .in("id", createdIds);
      if (profileErr) return json({ ok: false, error: profileErr.message }, 500);

      const byStudentStatus: Record<string, number> = {};
      let studentsTotal = 0;
      let studentsFrozen = 0;
      let tradersTotal = 0;

      (profileRows || []).forEach((row: any) => {
        const role = String(row.role || "");
        if (role !== "student" && role !== "trader") return;
        const key = String(row.student_status || DEFAULT_STUDENT_STATUS);
        byStudentStatus[key] = Number(byStudentStatus[key] || 0) + 1;
        studentsTotal += 1;
        if (row.status === "frozen") studentsFrozen += 1;
        if (role === "trader") tradersTotal += 1;
      });

      const { data: courseRows, error: courseErr } = await db
        .from("course_access")
        .select("user_id,status")
        .in("user_id", createdIds);
      if (courseErr) return json({ ok: false, error: courseErr.message }, 500);

      const courses: Record<(typeof COURSE_STATUSES)[number], number> = {
        requested: 0,
        approved: 0,
        rejected: 0,
        completed: 0
      };

      (courseRows || []).forEach((row: any) => {
        const status = String(row.status || "");
        if ((COURSE_STATUSES as readonly string[]).includes(status)) {
          (courses as any)[status] = Number((courses as any)[status] || 0) + 1;
        }
      });

      const { count: fileCount, error: fileErr } = await db
        .from("file_access_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "requested")
        .in("user_id", createdIds);
      if (fileErr) return json({ ok: false, error: fileErr.message }, 500);

      return json({
        ok: true,
        role: "assistant",
        scope: { leaderId: null },
        students: { total: studentsTotal, frozen: studentsFrozen, byStatus: byStudentStatus },
        leaders: { total: 0 },
        traders: { total: tradersTotal },
        coaches: { total: 0 },
        assistants: { total: 0 },
        leaderTeams: [],
        courses,
        pending: { courseAccessRequests: courses.requested, fileAccessRequests: Number(fileCount || 0) },
        records: { donate: 0, contact: 0, enrollment: 0, subscribe: 0 },
        downloads: { total: 0 },
        ladder: { requested: 0, approved: 0, rejected: 0 },
        generatedAt: new Date().toISOString()
      });
    }

    const leaderIdRaw = req.nextUrl.searchParams.get("leaderId");
    const leaderId =
      leaderIdRaw && isSuperAdmin(user.role)
        ? LeaderIdParam.safeParse(leaderIdRaw).success
          ? leaderIdRaw
          : null
        : null;

    const scopeLeaderId = user.role === "leader" ? user.id : leaderId;
    const scopeTreeIds = scopeLeaderId ? await fetchLeaderTreeIds(supabase, scopeLeaderId) : null;

    const studentCounts = await supabase.rpc(
      "report_student_status_counts",
      scopeLeaderId ? ({ _leader_id: scopeLeaderId } as any) : ({} as any)
    );
    if (studentCounts.error) return json({ ok: false, error: studentCounts.error.message }, 500);

    const courseCounts = await supabase.rpc(
      "report_course_access_status_counts",
      scopeLeaderId ? ({ _leader_id: scopeLeaderId } as any) : ({} as any)
    );
    if (courseCounts.error) return json({ ok: false, error: courseCounts.error.message }, 500);

    const filePending = await supabase.rpc(
      "report_pending_file_access_requests",
      scopeLeaderId ? ({ _leader_id: scopeLeaderId } as any) : ({} as any)
    );
    if (filePending.error) return json({ ok: false, error: filePending.error.message }, 500);

    const byStudentStatus: Record<string, number> = {};
    let studentsTotal = 0;
    let studentsFrozen = 0;

    for (const row of (studentCounts.data || []) as any[]) {
      const key = String(row.student_status || DEFAULT_STUDENT_STATUS);
      const total = Number(row.total || 0);
      const frozen = Number(row.frozen || 0);
      byStudentStatus[key] = total;
      studentsTotal += total;
      studentsFrozen += frozen;
    }

    let tradersTotal = 0;
    let leadersTotal = 0;
    let coachesTotal = 0;
    let assistantsTotal = 0;
    let leaderTeams: LeaderTeamRow[] = [];

    if (scopeTreeIds) {
      const subTreeIds = scopeTreeIds.filter((id: string) => id !== scopeLeaderId);
      const traderRes = subTreeIds.length
        ? await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "trader")
            .in("id", subTreeIds)
        : ({ count: 0, error: null } as any);

      if (traderRes.error) return json({ ok: false, error: traderRes.error.message }, 500);
      tradersTotal = Number(traderRes.count || 0);

      const coachRes = subTreeIds.length
        ? await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "coach")
            .in("id", subTreeIds)
        : ({ count: 0, error: null } as any);

      if (coachRes.error) return json({ ok: false, error: coachRes.error.message }, 500);
      coachesTotal = Number(coachRes.count || 0);

      const leaderRes = subTreeIds.length
        ? await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "leader")
            .in("id", subTreeIds)
        : ({ count: 0, error: null } as any);

      if (leaderRes.error) return json({ ok: false, error: leaderRes.error.message }, 500);
      leadersTotal = Number(leaderRes.count || 0);

      if (scopeLeaderId) {
        const assistantRes = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "assistant")
          .eq("created_by", scopeLeaderId);
        if (assistantRes.error) return json({ ok: false, error: assistantRes.error.message }, 500);
        assistantsTotal = Number(assistantRes.count || 0);
      }
    } else {
      const traderRes = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "trader");
      if (traderRes.error) return json({ ok: false, error: traderRes.error.message }, 500);
      tradersTotal = Number(traderRes.count || 0);

      const coachRes = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach");
      if (coachRes.error) return json({ ok: false, error: coachRes.error.message }, 500);
      coachesTotal = Number(coachRes.count || 0);

      const assistantRes = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "assistant");
      if (assistantRes.error) return json({ ok: false, error: assistantRes.error.message }, 500);
      assistantsTotal = Number(assistantRes.count || 0);
    }

    if (isSuperAdmin(user.role) && !scopeLeaderId) {
      const { data: leaders, error: leadersErr } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("role", "leader")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (leadersErr) return json({ ok: false, error: leadersErr.message }, 500);
      const leaderList = leaders || [];
      leadersTotal = leaderList.length;

      const { data: orgRows, error: orgErr } = await supabase
        .from("profiles")
        .select("id,leader_id,role")
        .in("role", ["leader", ...LEARNER_ROLES])
        .limit(20000);

      if (orgErr) return json({ ok: false, error: orgErr.message }, 500);

      const roleById = new Map<string, string>();
      const childrenByLeader = new Map<string, string[]>();
      (orgRows || []).forEach((row: any) => {
        const id = String(row.id || "");
        if (!id) return;
        roleById.set(id, String(row.role || ""));
        const parent = row.leader_id ? String(row.leader_id) : "";
        if (!parent) return;
        const list = childrenByLeader.get(parent) || [];
        list.push(id);
        childrenByLeader.set(parent, list);
      });

      const memo = new Map<string, { students: number; traders: number; leaders: number }>();
      const countSubtree = (rootId: string) => {
        if (memo.has(rootId)) return memo.get(rootId)!;
        const counts = { students: 0, traders: 0, leaders: 0 };
        const children = childrenByLeader.get(rootId) || [];
        children.forEach((childId) => {
          const role = roleById.get(childId);
          if (role === "leader") counts.leaders += 1;
          if (role === "trader") {
            counts.students += 1;
            counts.traders += 1;
          } else if (role === "student" || role === "coach") {
            counts.students += 1;
          }
          const childCounts = countSubtree(childId);
          counts.students += childCounts.students;
          counts.traders += childCounts.traders;
          counts.leaders += childCounts.leaders;
        });
        memo.set(rootId, counts);
        return counts;
      };

      leaderTeams = leaderList.map((leader: any) => {
        const current = countSubtree(String(leader.id));
        return {
          leader_id: leader.id,
          leader_name: leader.full_name || "",
          leader_email: leader.email || "",
          students: current.students,
          traders: current.traders,
          leaders: current.leaders
        };
      });
    } else if (isSuperAdmin(user.role) && !scopeTreeIds) {
      const { count, error: leaderCountErr } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "leader");
      if (!leaderCountErr) leadersTotal = Number(count || 0);
    }

    const courses: Record<(typeof COURSE_STATUSES)[number], number> = {
      requested: 0,
      approved: 0,
      rejected: 0,
      completed: 0
    };

    for (const row of (courseCounts.data || []) as any[]) {
      const st = String(row.status || "");
      if ((COURSE_STATUSES as readonly string[]).includes(st)) {
        (courses as any)[st] = Number(row.total || 0);
      }
    }

    const pendingFileAccessRequests = Number((filePending.data as any[])?.[0]?.total || 0);

    const records = { donate: 0, contact: 0, enrollment: 0, subscribe: 0 };
    const downloads = { total: 0 };
    const ladder = { requested: 0, approved: 0, rejected: 0 };

    if (isSuperAdmin(user.role)) {
      const recordCounts = await Promise.all(
        (Object.keys(records) as Array<keyof typeof records>).map((type) =>
          supabase.from("records").select("id", { count: "exact", head: true }).eq("type", type)
        )
      );
      for (let i = 0; i < recordCounts.length; i += 1) {
        const res: any = recordCounts[i];
        if (res?.error) return json({ ok: false, error: res.error.message }, 500);
        const key = (Object.keys(records) as Array<keyof typeof records>)[i];
        records[key] = Number(res?.count || 0);
      }

      const downloadsRes = await supabase.from("file_download_logs").select("id", { count: "exact", head: true });
      if (downloadsRes.error) return json({ ok: false, error: downloadsRes.error.message }, 500);
      downloads.total = Number(downloadsRes.count || 0);

      const ladderCounts = await Promise.all(
        (Object.keys(ladder) as Array<keyof typeof ladder>).map((status) =>
          supabase.from("ladder_authorizations").select("user_id", { count: "exact", head: true }).eq("status", status)
        )
      );
      for (let i = 0; i < ladderCounts.length; i += 1) {
        const res: any = ladderCounts[i];
        if (res?.error) return json({ ok: false, error: res.error.message }, 500);
        const key = (Object.keys(ladder) as Array<keyof typeof ladder>)[i];
        ladder[key] = Number(res?.count || 0);
      }
    }

    return json({
      ok: true,
      role: user.role,
      scope: { leaderId: scopeLeaderId || null },
      students: { total: studentsTotal, frozen: studentsFrozen, byStatus: byStudentStatus },
      leaders: { total: leadersTotal },
      traders: { total: tradersTotal },
      coaches: { total: coachesTotal },
      assistants: { total: assistantsTotal },
      leaderTeams,
      courses,
      pending: { courseAccessRequests: courses.requested, fileAccessRequests: pendingFileAccessRequests },
      records,
      downloads,
      ladder,
      generatedAt: new Date().toISOString()
    });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
