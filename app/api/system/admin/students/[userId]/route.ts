import { NextResponse } from "next/server";

import { requireManager } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEARNER_ROLES = ["student", "trader", "coach"] as const;
const DETAIL_ROLES = ["student", "trader", "coach", "assistant"] as const;
const DEFAULT_STUDENT_STATUS = "普通学�?;

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_req: Request, ctx: { params: { userId: string } }) {
  let supabase: Awaited<ReturnType<typeof requireManager>>["supabase"] | null = null;
  let viewerRole: "leader" | "super_admin" | "assistant" | null = null;
  let viewerId = "";
  let viewerLeaderId: string | null = null;
  try {
    const res = await requireManager();
    if (res.user.role === "coach") {
      return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
    }
    supabase = res.supabase;
    viewerRole =
      res.user.role === "super_admin"
        ? "super_admin"
        : res.user.role === "assistant"
          ? "assistant"
          : "leader";
    viewerId = res.user.id;
    viewerLeaderId = res.user.leader_id ?? null;
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }

  const userId = ctx.params.userId;
  if (!userId) return noStoreJson({ ok: false, error: "INVALID_USER" }, 400);

  const admin = supabaseAdmin();
  const db = viewerRole === "assistant" ? admin : supabase!;

  const [
    { data: user, error: userErr },
    { data: access, error: accessErr },
    { data: filePerms, error: filePermErr },
    { data: ladder, error: ladderErr }
  ] = await Promise.all([
    db
      .from("profiles")
      .select(
        "id,full_name,email,phone,role,status,created_at,last_login_at,student_status,leader_id,source,created_by"
      )
      .eq("id", userId)
      .maybeSingle(),
    db.from("course_access").select("*").eq("user_id", userId).order("course_id", { ascending: true }),
    db
      .from("file_permissions")
      .select("file_id,created_at,files(id,name,category)")
      .eq("grantee_profile_id", userId),
    db
      .from("ladder_authorizations")
      .select("user_id,status,enabled,requested_at,reviewed_at,reviewed_by,rejection_reason")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  if (userErr) return noStoreJson({ ok: false, error: userErr.message }, 500);
  if (!user?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);
  if (!DETAIL_ROLES.includes(user.role) && user.role !== "leader") {
    return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);
  }
  if (user.role === "leader" && viewerRole !== "super_admin") {
    return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);
  }
  if (viewerRole === "assistant") {
    if (user.created_by !== viewerId) {
      return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
    }
    if (viewerLeaderId && user.leader_id && user.leader_id !== viewerLeaderId) {
      return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
    }
  }
  if (accessErr) return noStoreJson({ ok: false, error: accessErr.message }, 500);
  if (filePermErr) return noStoreJson({ ok: false, error: filePermErr.message }, 500);
  if (ladderErr) return noStoreJson({ ok: false, error: ladderErr.message }, 500);

  let team:
    | {
        students: any[];
        summary: { total: number; frozen: number; byStatus: Record<string, number> };
        leaders: any[];
        leaderSummary: { total: number; active: number; frozen: number };
      }
    | null = null;
  if (user.role === "leader" && viewerRole === "super_admin") {
    const treeIds = await fetchLeaderTreeIds(supabase!, user.id);
    const scopedIds = treeIds.filter((id: string) => id !== user.id);
    const teamRows = scopedIds.length
      ? (
          await supabase!
            .from("profiles")
            .select("id,full_name,email,phone,status,student_status,created_at,last_login_at,role")
            .in("id", scopedIds)
            .order("created_at", { ascending: false })
            .limit(2000)
        ).data || []
      : [];

    const teamStudents = teamRows.filter((row: any) => LEARNER_ROLES.includes(row.role));
    const teamLeaders = teamRows.filter((row: any) => row.role === "leader");

    const summary = { total: 0, frozen: 0, byStatus: {} as Record<string, number> };
    teamStudents.forEach((row: any) => {
      summary.total += 1;
      if (String(row.status || "active") === "frozen") summary.frozen += 1;
      const key = String(row.student_status || DEFAULT_STUDENT_STATUS);
      summary.byStatus[key] = (summary.byStatus[key] || 0) + 1;
    });

    const leaderSummary = { total: 0, active: 0, frozen: 0 };
    teamLeaders.forEach((row: any) => {
      leaderSummary.total += 1;
      if (String(row.status || "active") === "frozen") leaderSummary.frozen += 1;
      else leaderSummary.active += 1;
    });

    team = { students: teamStudents, summary, leaders: teamLeaders, leaderSummary };
  }

  return noStoreJson({
    ok: true,
    user,
    access: access || [],
    filePermissions: filePerms || [],
    ladder: ladder || null,
    team
  });
}
