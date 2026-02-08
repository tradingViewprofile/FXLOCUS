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
  submissionId: z.string().uuid()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireManager();
    const admin = supabaseAdmin();
    const db = user.role === "coach" || user.role === "assistant" ? admin : supabase;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const { data: submission, error: subErr } = await db
      .from("trade_submissions")
      .select("id,user_id,leader_id,type,archived_at")
      .eq("id", parsed.data.submissionId)
      .maybeSingle();

    if (subErr) return json({ ok: false, error: subErr.message }, 500);
    if (!submission?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    if (submission.archived_at) return json({ ok: false, error: "ALREADY_ARCHIVED" }, 400);
    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.includes(submission.user_id)) {
        return json({ ok: false, error: "FORBIDDEN" }, 403);
      }
    } else if (user.role === "coach") {
      const assignedIds = await fetchCoachAssignedUserIds(supabase, user.id);
      if (!assignedIds.includes(submission.user_id)) {
        return json({ ok: false, error: "FORBIDDEN" }, 403);
      }
    } else if (user.role === "assistant") {
      const createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
      if (!createdIds.includes(submission.user_id)) {
        return json({ ok: false, error: "FORBIDDEN" }, 403);
      }
    }

    const now = new Date().toISOString();
    const up = await db
      .from("trade_submissions")
      .update({ archived_at: now, archived_by: user.id, updated_at: now } as any)
      .eq("id", submission.id);

    if (up.error) return json({ ok: false, error: up.error.message }, 500);

    const title =
      submission.type === "trade_strategy"
        ? "交易策略已存�?/ Strategy archived"
        : "交易日志已存�?/ Trade log archived";

    await db.from("notifications").insert({
      to_user_id: submission.user_id,
      from_user_id: user.id,
      title,
      content: "你的提交已存档�?
    } as any);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
