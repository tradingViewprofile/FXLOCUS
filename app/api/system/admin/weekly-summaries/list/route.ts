import { NextRequest, NextResponse } from "next/server";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchCoachAssignedUserIds } from "@/lib/system/coachAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";
import { getPagination } from "@/lib/system/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" }
  });
}

async function signedUrl(
  admin: ReturnType<typeof supabaseAdmin>,
  bucket: string | null,
  path: string | null
) {
  if (!bucket || !path) return null;
  return createSignedDownloadUrl(admin, bucket, path, 3600);
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireManager();
    const admin = supabaseAdmin();
    const db = user.role === "coach" || user.role === "assistant" ? admin : supabase;
    const roleParam = (req.nextUrl.searchParams.get("role") || "").trim();
    const roleFilter = roleParam === "leader" ? "leader" : roleParam === "assistant" ? "assistant" : "student";
    const leaderId = (req.nextUrl.searchParams.get("leaderId") || "").trim();
    const coachRaw = (req.nextUrl.searchParams.get("coachId") || "").trim();
    const coachId = coachRaw && /^[0-9a-fA-F-]{36}$/.test(coachRaw) ? coachRaw : "";
    if (coachRaw && !coachId) return json({ ok: false, error: "INVALID_COACH" }, 400);
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });

    let query = db
      .from("weekly_summaries")
      .select(
        [
          "id",
          "user_id",
          "leader_id",
          "student_name",
          "summary_text",
          "review_note",
          "reviewed_at",
          "created_at",
          "strategy_bucket",
          "strategy_path",
          "strategy_name",
          "strategy_mime_type",
          "curve_bucket",
          "curve_path",
          "curve_name",
          "curve_mime_type",
          "stats_bucket",
          "stats_path",
          "stats_name",
          "stats_mime_type",
          "user:profiles!weekly_summaries_user_id_fkey(full_name,email,phone,role,leader_id)"
        ].join(","),
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (coachId) {
      if (user.role === "assistant") return json({ ok: false, error: "FORBIDDEN" }, 403);
      if (user.role === "coach" && coachId !== user.id) return json({ ok: false, error: "FORBIDDEN" }, 403);
      if (user.role === "leader") {
        const treeIds = await fetchLeaderTreeIds(supabase, user.id);
        if (!treeIds.includes(coachId)) return json({ ok: false, error: "FORBIDDEN" }, 403);
      }
      const { data: assignedRows, error: assignedErr } = await supabase
        .from("coach_assignments")
        .select("assigned_user_id")
        .eq("coach_id", coachId);
      if (assignedErr) return json({ ok: false, error: assignedErr.message }, 500);
      const assignedIds = (assignedRows || []).map((row: any) => row.assigned_user_id).filter(Boolean);
      if (!assignedIds.length) return json({ ok: true, items: [], leaders: [] });
      query = query.in("user_id", assignedIds);
    } else if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.length) return json({ ok: true, items: [], leaders: [] });
      query = query.in("user_id", treeIds);
    } else if (user.role === "coach") {
      const assignedIds = await fetchCoachAssignedUserIds(supabase, user.id);
      if (!assignedIds.length) return json({ ok: true, items: [], leaders: [] });
      query = query.in("user_id", assignedIds);
    } else if (user.role === "assistant") {
      const createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
      if (!createdIds.length) return json({ ok: true, items: [], leaders: [] });
      query = query.in("user_id", createdIds);
    } else if (leaderId && (roleFilter === "student" || roleFilter === "assistant")) {
      const treeIds = await fetchLeaderTreeIds(supabase, leaderId);
      if (!treeIds.length) return json({ ok: true, items: [], leaders: [] });
      query = query.in("user_id", treeIds);
    } else if (leaderId && roleFilter === "leader") {
      query = query.eq("user_id", leaderId);
    }

    const { data: rows, error, count } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);

    const filteredRows = (rows || []).filter((row: any) => {
      const role = String(row.user?.role || "");
      if (!roleFilter) return true;
      if (roleFilter === "student") return role === "student" || role === "trader";
      if (roleFilter === "assistant") return role === "assistant";
      return role === roleFilter;
    });

    let leaders: Array<{ id: string; full_name: string | null; email: string | null }> = [];
    if (user.role === "super_admin") {
      const { data: leaderRows, error: leaderErr } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("role", "leader")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (!leaderErr && Array.isArray(leaderRows)) leaders = leaderRows as any;
    }

    const total = filteredRows.length;
    const start = (page - 1) * pageSize;
    const pageRows = filteredRows.slice(start, start + pageSize);
    const items = await Promise.all(
      pageRows.map(async (row: any) => {
        const strategyUrl = await signedUrl(admin, row.strategy_bucket, row.strategy_path);
        const curveUrl = await signedUrl(admin, row.curve_bucket, row.curve_path);
        const statsUrl = await signedUrl(admin, row.stats_bucket, row.stats_path);
        return {
          id: row.id,
          user_id: row.user_id,
          leader_id: row.leader_id,
          student_name: row.student_name,
          summary_text: row.summary_text,
          review_note: row.review_note,
          reviewed_at: row.reviewed_at,
          created_at: row.created_at,
          strategy_name: row.strategy_name,
          strategy_mime_type: row.strategy_mime_type,
          strategy_url: strategyUrl,
          curve_name: row.curve_name,
          curve_mime_type: row.curve_mime_type,
          curve_url: curveUrl,
          stats_name: row.stats_name,
          stats_mime_type: row.stats_mime_type,
          stats_url: statsUrl,
          user: row.user || null
        };
      })
    );

    return json({
      ok: true,
      items,
      leaders,
      page,
      pageSize,
      total
    });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
