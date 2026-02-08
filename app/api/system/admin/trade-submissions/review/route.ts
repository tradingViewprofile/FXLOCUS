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
  submissionId: z.string().uuid(),
  note: z.string().max(500).optional()
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
      .select("id,user_id,leader_id,type,status")
      .eq("id", parsed.data.submissionId)
      .maybeSingle();

    if (subErr) return json({ ok: false, error: subErr.message }, 500);
    if (!submission?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    if (submission.status !== "submitted") {
      return json({ ok: false, error: "ALREADY_REVIEWED" }, 400);
    }
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
    const note = parsed.data.note?.trim() || null;
    const patch: Record<string, unknown> = {
      status: "approved",
      reviewed_at: now,
      reviewed_by: user.id,
      updated_at: now,
      review_note: note,
      rejection_reason: null
    };

    const up = await db.from("trade_submissions").update(patch as any).eq("id", submission.id);
    if (up.error) return json({ ok: false, error: up.error.message }, 500);

    const title =
      submission.type === "trade_strategy"
        ? "交易策略已阅 / Strategy reviewed"
        : "交易日志已阅 / Trade log reviewed";
    const content =
      note && note.length
        ? `审批意见�?{note}\n\nReview note: ${note}`
        : "你的提交已阅�?;

    await db.from("notifications").insert({
      to_user_id: submission.user_id,
      from_user_id: user.id,
      title,
      content
    } as any);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
