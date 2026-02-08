import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchCoachAssignedUserIds } from "@/lib/system/coachAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  type: z.enum(["trade_log", "trade_strategy"]),
  coachId: z.string().uuid().optional().nullable()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireManager();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const { type, coachId } = parsed.data;
    const admin = supabaseAdmin();
    const db = user.role === "coach" || user.role === "assistant" ? admin : supabase;

    let scopeIds: string[] | null = null;
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
      scopeIds = (assignedRows || []).map((row: any) => row.assigned_user_id).filter(Boolean);
    } else if (user.role === "leader") {
      scopeIds = await fetchLeaderTreeIds(supabase, user.id);
    } else if (user.role === "coach") {
      scopeIds = await fetchCoachAssignedUserIds(supabase, user.id);
    } else if (user.role === "assistant") {
      scopeIds = await fetchAssistantCreatedUserIds(admin, user.id);
    }

    if (scopeIds && !scopeIds.length) return json({ ok: true, count: 0 });

    let query = db
      .from("trade_submissions")
      .select("id,user_id")
      .eq("status", "submitted")
      .eq("type", type)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (scopeIds) query = query.in("user_id", scopeIds);

    const { data: submissions, error } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);
    const ids = (submissions || []).map((row: any) => row.id);
    if (!ids.length) return json({ ok: true, count: 0 });

    const now = new Date().toISOString();
    const up = await db
      .from("trade_submissions")
      .update({
        status: "approved",
        reviewed_at: now,
        reviewed_by: user.id,
        updated_at: now,
        review_note: null,
        rejection_reason: null
      } as any)
      .in("id", ids);
    if (up.error) return json({ ok: false, error: up.error.message }, 500);

    const title =
      type === "trade_strategy"
        ? "交易策略已阅 / Strategy reviewed"
        : "交易日志已阅 / Trade log reviewed";
    const content =
      type === "trade_strategy"
        ? "你的交易策略已阅。\n\nYour trade strategy has been reviewed."
        : "你的交易日志已阅。\n\nYour trade log has been reviewed.";

    const notifications = (submissions || []).map((row: any) => ({
      to_user_id: row.user_id,
      from_user_id: user.id,
      title,
      content
    }));
    const ins = await db.from("notifications").insert(notifications as any);
    if (ins.error) return json({ ok: false, error: ins.error.message }, 500);

    return json({ ok: true, count: ids.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
