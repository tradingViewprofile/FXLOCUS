import { NextRequest, NextResponse } from "next/server";

import { dbAll, dbFirst } from "@/lib/db/d1";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { requireManager } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { getPagination } from "@/lib/system/pagination";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { fetchStudentSupportNames } from "@/lib/system/studentSupport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" }
  });
}

function inClause(ids: string[]) {
  const unique = Array.from(new Set(ids.map(String).filter(Boolean)));
  if (!unique.length) return { sql: "1=0", params: [] as any[] };
  return { sql: `cn.user_id in (${unique.map(() => "?").join(",")})`, params: unique };
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireManager();
    if (user.role === "coach") return json({ ok: false, error: "FORBIDDEN" }, 403);

    const admin = supabaseAdmin();
    const leaderId = (req.nextUrl.searchParams.get("leaderId") || "").trim();
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });
    const limit = to - from + 1;

    let scopeIds: string[] | null = null;
    if (user.role === "leader") {
      scopeIds = await fetchLeaderTreeIds(admin, user.id);
    } else if (user.role === "assistant") {
      scopeIds = await fetchAssistantCreatedUserIds(admin, user.id);
    } else if (leaderId) {
      scopeIds = await fetchLeaderTreeIds(admin, leaderId);
    }

    const whereParts: string[] = ["cn.submitted_at is not null"];
    const params: any[] = [];
    if (Array.isArray(scopeIds)) {
      const clause = inClause(scopeIds);
      whereParts.push(clause.sql);
      params.push(...clause.params);
    }
    const where = `where ${whereParts.join(" and ")}`;

    const totalRow = await dbFirst<{ count: number }>(
      `select count(*) as count from course_notes cn ${where}`,
      params
    );
    const total = Number(totalRow?.count || 0);

    const rows = await dbAll<any>(
      `select
         cn.id,
         cn.user_id,
         cn.course_id,
         cn.content_html,
         cn.content_md,
         cn.submitted_at,
         cn.reviewed_at,
         cn.reviewed_by,
         cn.review_note,
         cn.updated_at,
         p.full_name as user_full_name,
         p.email as user_email,
         p.phone as user_phone,
         p.leader_id as user_leader_id
       from course_notes cn
       left join profiles p on p.id = cn.user_id
       ${where}
       order by cn.submitted_at desc
       limit ? offset ?`,
      [...params, limit, from]
    );

    const userIds = Array.from(new Set(rows.map((row: any) => String(row.user_id || "")).filter(Boolean)));
    const supportMap = userIds.length ? await fetchStudentSupportNames(admin, userIds) : new Map();

    const items = rows.map((row: any) => {
      const support = supportMap.get(String(row.user_id || ""));
      return {
        id: row.id,
        user_id: row.user_id,
        course_id: row.course_id,
        content_html: row.content_html,
        content_md: row.content_md,
        submitted_at: row.submitted_at,
        reviewed_at: row.reviewed_at,
        reviewed_by: row.reviewed_by,
        review_note: row.review_note,
        updated_at: row.updated_at,
        user: row.user_id
          ? {
              full_name: row.user_full_name ?? null,
              email: row.user_email ?? null,
              phone: row.user_phone ?? null,
              leader_id: row.user_leader_id ?? null,
              support_name: support?.displayName || null,
              assistant_name: support?.assistantName || null,
              coach_name: support?.coachName || null
            }
          : null
      };
    });

    return json({ ok: true, items, page, pageSize, total });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}


