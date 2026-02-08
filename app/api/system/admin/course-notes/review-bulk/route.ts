import { NextRequest, NextResponse } from "next/server";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(_req: NextRequest) {
  try {
    const { user } = await requireManager();
    if (user.role === "coach") return json({ ok: false, error: "FORBIDDEN" }, 403);
    const admin = supabaseAdmin();

    let scopeIds: string[] | null = null;
    if (user.role === "leader") {
      scopeIds = await fetchLeaderTreeIds(admin, user.id);
    } else if (user.role === "assistant") {
      scopeIds = await fetchAssistantCreatedUserIds(admin, user.id);
    }

    if (scopeIds && !scopeIds.length) return json({ ok: true, count: 0 });

    let query = admin
      .from("course_notes")
      .select("id,user_id,course_id")
      .is("reviewed_at", null)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(500);
    if (scopeIds) query = query.in("user_id", scopeIds);

    const { data: notes, error } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);
    const ids = (notes || []).map((row: any) => row.id);
    if (!ids.length) return json({ ok: true, count: 0 });

    const now = new Date().toISOString();
    const up = await admin
      .from("course_notes")
      .update({
        reviewed_at: now,
        reviewed_by: user.id,
        review_note: null
      } as any)
      .in("id", ids);
    if (up.error) return json({ ok: false, error: up.error.message }, 500);

    const notifications = (notes || []).map((row: any) => ({
      to_user_id: row.user_id,
      from_user_id: user.id,
      title: "课程总结已阅 / Course summary reviewed",
      content: `�?{row.course_id}课总结已阅。\n\nLesson ${row.course_id} summary reviewed.`
    }));
    const ins = await admin.from("notifications").insert(notifications as any);
    if (ins.error) return json({ ok: false, error: ins.error.message }, 500);

    return json({ ok: true, count: ids.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
