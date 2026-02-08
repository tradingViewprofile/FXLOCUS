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
  entryId: z.string().uuid(),
  reviewNote: z.string().max(2000).optional().nullable()
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

    const { data: entry, error } = await db
      .from("weekly_summaries")
      .select("id,user_id")
      .eq("id", parsed.data.entryId)
      .maybeSingle();
    if (error) return json({ ok: false, error: error.message }, 500);
    if (!entry?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);

    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.includes(entry.user_id)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    } else if (user.role === "coach") {
      const assignedIds = await fetchCoachAssignedUserIds(supabase, user.id);
      if (!assignedIds.includes(entry.user_id)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    } else if (user.role === "assistant") {
      const createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
      if (!createdIds.includes(entry.user_id)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const now = new Date().toISOString();
    const reviewNote = String(parsed.data.reviewNote || "").trim();
    const { error: upErr } = await db
      .from("weekly_summaries")
      .update({
        reviewed_at: now,
        reviewed_by: user.id,
        review_note: reviewNote || null
      })
      .eq("id", entry.id);
    if (upErr) return json({ ok: false, error: upErr.message }, 500);

    const title = reviewNote
      ? "周总结已回�?/ Weekly summary replied"
      : "周总结已阅 / Weekly summary reviewed";
    const content = reviewNote
      ? `你的周总结已回复：${reviewNote}\n\nYour weekly summary review note: ${reviewNote}`
      : "你的周总结已阅。\n\nYour weekly summary has been reviewed.";

    await db.from("notifications").insert({
      to_user_id: entry.user_id,
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
